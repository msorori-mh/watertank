import { supabase } from "@/integrations/supabase/client";

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
  // Try sign in, else sign up
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error) return signIn.data;
  const signUp = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { phone, type: "customer", role: "customer" },
      emailRedirectTo: `${window.location.origin}/customer`,
    },
  });
  if (signUp.error) throw signUp.error;
  // Auto-confirm is on, but session may not exist; sign in again
  const retry = await supabase.auth.signInWithPassword({ email, password });
  if (retry.error) throw retry.error;
  return retry.data;
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
