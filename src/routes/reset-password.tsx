import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase auto-handles the recovery hash and creates a session.
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => {
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const submit = async () => {
    setError("");
    if (password.length < 6) return setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(async () => {
        await supabase.auth.signOut();
        nav({ to: "/admin/login" });
      }, 1500);
    } catch (e: any) {
      setError(e.message || "تعذّر تحديث كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">إعادة تعيين كلمة المرور</h1>
          <p className="text-sm text-muted-foreground mt-2">أدخل كلمة المرور الجديدة لحسابك</p>
        </div>

        {!ready ? (
          <div className="text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary mb-3" />
            جارٍ التحقق من رابط الاستعادة...
          </div>
        ) : done ? (
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 px-4 py-4 text-center text-emerald-700">
            تم تحديث كلمة المرور بنجاح. جارٍ تحويلك لتسجيل الدخول...
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="password" dir="ltr"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none"
            />
            <input
              type="password" dir="ltr"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="تأكيد كلمة المرور"
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              onClick={submit} disabled={loading}
              className="w-full rounded-xl bg-primary px-5 py-4 font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ كلمة المرور
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
