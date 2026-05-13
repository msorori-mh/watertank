import { lovable } from "@/integrations/lovable/index";

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
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: `${window.location.origin}/auth/callback`,
  });
  if (result.error) {
    clearPendingRole();
    throw result.error instanceof Error ? result.error : new Error(String(result.error));
  }
  return result;
};
