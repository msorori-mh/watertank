import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export async function requireSession(loginPath: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw redirect({ to: loginPath });
  return session;
}

export async function requireAdmin() {
  const session = await requireSession("/admin/login");
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id);
  if (!roles?.some((r) => r.role === "admin")) {
    await supabase.auth.signOut();
    throw redirect({ to: "/admin/login" });
  }
  return session;
}

export async function requireCustomer() {
  const session = await requireSession("/customer/login");
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("is_active, city").eq("id", session.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", session.user.id),
  ]);
  const googleUser = session.user.app_metadata?.provider === "google";
  const customer = roles?.some((row) => row.role === "customer");
  const driver = roles?.some((row) => row.role === "driver");
  if (!googleUser || !customer || driver) {
    await supabase.auth.signOut();
    throw redirect({ to: "/customer/login" });
  }
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    throw redirect({ to: "/customer/login" });
  }
  return { session, profile };
}

export async function requireDriverSession() {
  const session = await requireSession("/driver/login");
  const [{ data: driver }, { data: roles }] = await Promise.all([
    supabase.from("drivers").select("id").eq("user_id", session.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", session.user.id),
  ]);
  if (session.user.app_metadata?.provider !== "google" || !roles?.some((row) => row.role === "driver")) {
    await supabase.auth.signOut();
    throw redirect({ to: "/driver/login" });
  }
  return { session, driver };
}

export async function requireDriverOnboarding() {
  const session = await requireSession("/driver/login");
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
  if (session.user.app_metadata?.provider !== "google" || !roles?.some((row) => row.role === "driver")) {
    await supabase.auth.signOut();
    throw redirect({ to: "/driver/login" });
  }
  return session;
}

export const adminRouteGuard = { beforeLoad: requireAdmin };
export const customerRouteGuard = { beforeLoad: requireCustomer };
export const driverRouteGuard = { beforeLoad: requireDriverSession };
export const driverOnboardingRouteGuard = { beforeLoad: requireDriverOnboarding };

/**
 * MVP-02-CASH-ONLY-SCOPE
 * Deferred (post-MVP) finance/wallet features: block direct access before any
 * query runs. Files, backend logic and historical data are intentionally kept.
 */
export function deferredFeatureGuard(to: string) {
  return () => {
    throw redirect({ to: to as never });
  };
}
