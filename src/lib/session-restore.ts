import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type SessionDestination =
  | "/admin"
  | "/customer"
  | "/customer/profile/complete"
  | "/driver"
  | "/driver/register";

export async function getRestoredSessionDestination(): Promise<SessionDestination | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const [{ data: roles }, { data: driver }, { data: profile }, { data: address }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", session.user.id),
    supabase.from("drivers").select("id").eq("user_id", session.user.id).maybeSingle(),
    supabase.from("profiles").select("phone,city").eq("id", session.user.id).maybeSingle(),
    supabase.from("addresses").select("id").eq("user_id", session.user.id).eq("is_default", true).maybeSingle(),
  ]);

  if (roles?.some((row) => row.role === "admin")) return "/admin";
  if (session.user.app_metadata?.provider !== "google") {
    await supabase.auth.signOut();
    return null;
  }
  if (roles?.some((row) => row.role === "driver")) return driver ? "/driver" : "/driver/register";
  return profile?.phone && profile?.city && address ? "/customer" : "/customer/profile/complete";
}

export function useSessionRestore() {
  const navigate = useNavigate();
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;

    getRestoredSessionDestination()
      .then((destination) => {
        if (!active) return;
        if (destination) {
          navigate({ to: destination, replace: true });
          return;
        }
        setRestoring(false);
      })
      .catch(() => {
        if (active) setRestoring(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  return restoring;
}
