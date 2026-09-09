import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export type PendingRole = "customer" | "driver";
const KEY = "wayet_pending_role";

export const setPendingRole = (role: PendingRole) => {
  try { localStorage.setItem(KEY, role); } catch {}
};
export const getPendingRole = (): PendingRole | null => {
  try { return (localStorage.getItem(KEY) as PendingRole) || null; } catch { return null; }
};
export const clearPendingRole = () => {
  try { localStorage.removeItem(KEY); } catch {}
};

export const signInWithGoogle = async (role: PendingRole) => {
  setPendingRole(role);
  const native = Capacitor.isNativePlatform();
  const redirectTo = native
    ? "app.wayetmaa.mobile://auth/callback"
    : `${window.location.origin}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: native,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) {
    clearPendingRole();
    throw error;
  }
  if (native) {
    if (!data.url) {
      clearPendingRole();
      throw new Error("تعذّر فتح تسجيل الدخول عبر Google.");
    }
    await Browser.open({ url: data.url, presentationStyle: "popover" });
  }
  return data;
};
