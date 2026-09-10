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

  if (native) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "app.wayetmaa.mobile://auth/callback",
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data?.url) {
      clearPendingRole();
      throw error ?? new Error("تعذّر فتح تسجيل الدخول عبر Google.");
    }
    await Browser.open({ url: data.url, presentationStyle: "popover" });
    return data;
  }

  // Web/preview: go through the managed broker (iframe-safe, no provider 403).
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: `${window.location.origin}/auth/callback`,
    extraParams: { prompt: "select_account" },
  });
  if ((result as any)?.error) {
    clearPendingRole();
    throw (result as any).error;
  }
  if (!(result as any)?.redirected) {
    window.location.assign("/auth/callback");
  }
  return result;
};

