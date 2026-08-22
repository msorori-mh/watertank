import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type SessionDestination =
  | "/admin"
  | "/customer"
  | "/driver"
  | "/driver/register";

export async function getRestoredSessionDestination(): Promise<SessionDestination | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const [{ data: roles }, { data: driver }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", session.user.id),
    supabase.from("drivers").select("id").eq("user_id", session.user.id).maybeSingle(),
  ]);

  if (roles?.some((row) => row.role === "admin")) return "/admin";
  if (driver) return "/driver";
  if (session.user.user_metadata?.type === "driver") return "/driver/register";
  return "/customer";
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
