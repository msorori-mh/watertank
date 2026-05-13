import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPendingRole, clearPendingRole, type PendingRole } from "@/lib/google-auth";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const nav = useNavigate();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const finalize = async (userId: string, email: string | null, meta: any) => {
      const intended: PendingRole = getPendingRole() || "customer";

      // Check existing role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const existing = (roles || []).map((r: any) => r.role as string);

      // Admin accounts: do not let them be hijacked, just send them home
      if (existing.includes("admin")) {
        clearPendingRole();
        await supabase.auth.signOut();
        setError("هذا الحساب حساب إدارة. سجّل دخول الإدارة من صفحة الإدارة.");
        return;
      }

      // Conflict detection
      if (existing.length > 0 && !existing.includes(intended)) {
        clearPendingRole();
        await supabase.auth.signOut();
        const otherLabel = existing.includes("customer") ? "كعميل" : "كسائق";
        setError(
          `هذا الحساب مسجل ${otherLabel}. استخدم حساباً آخر أو تواصل مع الإدارة لتغيير الدور.`,
        );
        return;
      }

      // Ensure profile exists / update with Google data
      const fullName =
        meta?.full_name || meta?.name || meta?.user_name || email || "";
      const avatar = meta?.avatar_url || meta?.picture || null;

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("profiles").insert({
          id: userId,
          email,
          name: fullName,
          type: intended,
          phone: null,
        } as any);
      } else if (!existingProfile.name && fullName) {
        await supabase.from("profiles").update({ name: fullName } as any).eq("id", userId);
      }

      // Assign role if not yet present
      if (existing.length === 0) {
        await supabase.from("user_roles").insert({
          user_id: userId,
          role: intended,
        } as any);
      }

      // Stash avatar locally (no avatar column in profiles)
      if (avatar) {
        try { localStorage.setItem("wayet_avatar_" + userId, avatar); } catch {}
      }

      clearPendingRole();

      if (intended === "driver") {
        const { data: drv } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        nav({ to: drv ? "/driver" : "/driver/register" });
      } else {
        nav({ to: "/customer" });
      }
    };

    const run = async () => {
      // Wait briefly for setSession from the lovable wrapper, or read it directly
      for (let i = 0; i < 30 && !cancelled; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          await finalize(
            data.session.user.id,
            data.session.user.email ?? null,
            data.session.user.user_metadata || {},
          );
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!cancelled) setError("تعذّر إكمال تسجيل الدخول. حاول مرة أخرى.");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {error ? (
          <>
            <h1 className="font-display text-xl font-bold mb-3">تعذّر تسجيل الدخول</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <a href="/customer/login" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">دخول العميل</a>
              <a href="/driver/login" className="rounded-xl bg-[#1a5276] px-4 py-2 text-sm font-bold text-white">دخول السائق</a>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">جارٍ إكمال تسجيل الدخول…</p>
          </>
        )}
      </div>
    </div>
  );
}
