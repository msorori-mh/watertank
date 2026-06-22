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
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, city")
    .eq("id", session.user.id)
    .maybeSingle();
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    throw redirect({ to: "/customer/login" });
  }
  return { session, profile };
}

export async function requireDriverSession() {
  const session = await requireSession("/driver/login");
  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  return { session, driver };
}

export const adminRouteGuard = { beforeLoad: requireAdmin };
export const customerRouteGuard = { beforeLoad: requireCustomer };
export const driverRouteGuard = { beforeLoad: requireDriverSession };
