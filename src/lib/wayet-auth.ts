import { supabase } from "@/integrations/supabase/client";
import { DEMO_AUTH_ENABLED } from "@/lib/demo-flag";

// MVP: الوضع التجريبي متاح فقط في التطوير، ولا يعمل إطلاقاً في الإنتاج.
const DEMO_MODE = DEMO_AUTH_ENABLED === true || import.meta.env.VITE_DEMO_AUTH === "true";
// Limited production pilot: the UI remains phone/password, while Auth uses an internal
// deterministic email because SMS/WhatsApp verification is temporarily unavailable.
const PHONE_PASSWORD_PILOT = import.meta.env.VITE_PHONE_PASSWORD_PILOT === "true";
const DEMO_OTP = "1234";
const PHONE_PWD_PREFIX = "wayet_pwd_";

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("967")) return `+${digits}`;
  if (digits.startsWith("0")) return `+967${digits.slice(1)}`;
  return `+967${digits}`;
};

const phoneDigits = (phone: string) => normalizePhone(phone).replace(/[^0-9]/g, "");

const demoEmail = (phone: string) => `phone-${phoneDigits(phone)}@wayet.local`;

const getDemoPassword = (phone: string) => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${PHONE_PWD_PREFIX}${phoneDigits(phone)}`);
  } catch {
    return null;
  }
};

const setDemoPassword = (phone: string, password: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${PHONE_PWD_PREFIX}${phoneDigits(phone)}`, password);
  } catch {
    /* ignore */
  }
};

const ensureDriverRole = async () => {
  const { error } = await supabase.rpc("assign_initial_role", { _role: "driver" });
  if (error) throw error;
};

export const sendOtp = async (phone: string) => {
  if (!phone.trim()) throw new Error("ادخل رقم الهاتف");
  const formatted = normalizePhone(phone);

  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 400));
    return { sent: true };
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
  if (error) throw error;
  return { sent: true };
};

export const verifyOtpAndLogin = async (
  phone: string,
  code: string,
  portal: "customer" | "driver" = "customer",
) => {
  const formatted = normalizePhone(phone);

  if (DEMO_MODE) {
    if (code !== DEMO_OTP) throw new Error("الرمز غير صحيح");
    const email = demoEmail(phone);
    let password = getDemoPassword(phone);
    if (!password) {
      password = crypto.randomUUID() + crypto.randomUUID();
      setDemoPassword(phone, password);
    }

    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.error && signIn.data.user) {
      if (portal === "driver") await ensureDriverRole();
      return signIn.data;
    }

    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { phone: formatted, name: "", type: portal },
      },
    });
    if (signUp.error) throw signUp.error;

    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (retry.error) throw retry.error;
    if (portal === "driver") await ensureDriverRole();
    return retry.data;
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: formatted,
    token: code.trim(),
    type: "sms",
  });
  if (error) throw error;
  if (portal === "driver") await ensureDriverRole();
  return data;
};

export const signInWithPhonePassword = async (phone: string, password: string) => {
  const formatted = normalizePhone(phone);
  const credentials = PHONE_PASSWORD_PILOT
    ? { email: demoEmail(formatted), password }
    : { phone: formatted, password };
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) throw error;
  return data;
};

export const signUpWithPhonePassword = async (
  phone: string,
  password: string,
  name: string,
  portal: "customer" | "driver" = "customer",
) => {
  const formatted = normalizePhone(phone);
  const credentials = PHONE_PASSWORD_PILOT
    ? { email: demoEmail(formatted), password }
    : { phone: formatted, password };
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      data: { phone: formatted, name: name.trim(), type: portal },
    },
  });
  if (error) throw error;

  // The limited pilot must have phone confirmation disabled in Supabase.
  // Fail closed instead of pretending registration succeeded without a session.
  let sessionData = data;
  if (!sessionData.session) {
    const retry = await supabase.auth.signInWithPassword(credentials);
    if (retry.error || !retry.data.session) {
      throw new Error(
        "تم إنشاء الحساب لكنه يحتاج تفعيل إعداد الدخول التجريبي من الإدارة قبل استخدامه.",
      );
    }
    sessionData = retry.data;
  }

  if (portal === "driver") await ensureDriverRole();
  return sessionData;
};

export const adminLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

// MVP-01-SECURITY-CLOSURE: admin self-signup / self-promotion removed.
// Admin accounts are provisioned by an existing admin only.


export const signOut = async () => {
  await supabase.auth.signOut();
};

export const isDemoAuth = () => DEMO_MODE;
export const demoOtpHint = () => (DEMO_MODE ? DEMO_OTP : null);
