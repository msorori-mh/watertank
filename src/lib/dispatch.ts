import { supabase } from "@/integrations/supabase/client";

// Off until the candidate schema, worker and device acceptance tests are deployed.
export const dispatchEnabled = import.meta.env.VITE_AUTOMATIC_DISPATCH === "true";
export type DispatchOffer = {
  id: string; order_id: string; city: string; capacity: number;
  water_type: string; price: number; expires_at: string; server_now: string;
};
// Temporary boundary until database types can be generated from the correct project.
const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string, args?: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
export async function dispatchCall<T>(name: "dispatch_heartbeat" | "dispatch_offer" | "dispatch_respond" | "dispatch_status" | "dispatch_manual_queue", args?: Record<string, unknown>) {
  const result = await rpc(name, args);
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
