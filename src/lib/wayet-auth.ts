import { supabase } from "@/integrations/supabase/client";
import { isAdminPhone } from "@/lib/admin-phones";

const DEMO_OTP = "1234";
const ADMIN_SETUP_CODE = "WAYET2025";

const phoneToCreds = (phone: string) => {
  const clean = phone.replace(/[^0-9]/g, "");
  return {
    email: `phone-${clean}@wayet.local`,
    password: `wayet-pwd-${clean}-secure`,
  };
};

export const sendOtp = async (phone: string) => {
  if (!phone.trim()) throw new Error("ادخل رقم الهاتف");
  // Simulated — return demo code hint
  await new Promise((r) => setTimeout(r, 500));
  return { sent: true };
};

export const verifyOtpAndLogin = async (phone: string, code: string) => {
  if (code !== DEMO_OTP) throw new Error("الرمز غير صحيح. الرمز التجريبي: 1234");
  const { email, password } = phoneToCreds(phone);
  const adminPhone = isAdminPhone(phone);
  const initialType = adminPhone ? "admin" : "customer";
  const initialRole = adminPhone ? "admin" : "customer";

  // Try sign in, else sign up
  let session = await supabase.auth.signInWithPassword({ email, password });
  if (session.error) {
    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { phone, type: initialType, role: initialRole },
        emailRedirectTo: `${window.location.origin}/${adminPhone ? "admin" : "customer"}`,
      },
    });
    if (signUp.error) throw signUp.error;
    session = await supabase.auth.signInWithPassword({ email, password });
    if (session.error) throw session.error;
  }

  // Promote to admin if phone is in admin list (covers users who already
  // signed up earlier as customer).
  if (adminPhone && session.data.user) {
    const uid = session.data.user.id;
    await supabase.from("user_roles").upsert(
      { user_id: uid, role: "admin" } as any,
      { onConflict: "user_id,role" } as any,
    );
    await supabase.from("profiles").update({ type: "admin" } as any).eq("id", uid);
  }

  return { ...session.data, isAdmin: adminPhone };
};

export const adminLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const adminSignup = async (
  email: string,
  password: string,
  name: string,
  setupCode: string,
) => {
  if (setupCode !== ADMIN_SETUP_CODE)
    throw new Error("رمز إعداد المدير غير صحيح");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, type: "admin", role: "admin" },
      emailRedirectTo: `${window.location.origin}/admin`,
    },
  });
  if (error) throw error;
  // Sign in
  const retry = await supabase.auth.signInWithPassword({ email, password });
  if (retry.error) throw retry.error;
  return retry.data;
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

export const DEMO_OTP_CODE = DEMO_OTP;
