import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const CALLBACK = "app.wayetmaa.mobile://auth/callback";
let exchanging = false;

async function acceptOAuthUrl(url: string) {
  if (!url.startsWith(CALLBACK) || exchanging) return;
  exchanging = true;
  try {
    const callback = new URL(url);
    const oauthError = callback.searchParams.get("error_description") || callback.searchParams.get("error");
    if (oauthError) throw new Error(oauthError);
    const code = callback.searchParams.get("code");
    if (!code) throw new Error("لم يصل رمز تسجيل الدخول من Google.");
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    await Browser.close().catch(() => undefined);
    window.location.assign("/auth/callback");
  } catch (cause) {
    await Browser.close().catch(() => undefined);
    const message = cause instanceof Error ? cause.message : "تعذّر إكمال تسجيل الدخول.";
    window.location.assign(`/auth/callback?oauth_error=${encodeURIComponent(message)}`);
  } finally {
    exchanging = false;
  }
}

export async function initializeMobileOAuth() {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  const listener = await App.addListener("appUrlOpen", ({ url }) => void acceptOAuthUrl(url));
  const launch = await App.getLaunchUrl();
  if (launch?.url) void acceptOAuthUrl(launch.url);
  return () => void listener.remove();
}
