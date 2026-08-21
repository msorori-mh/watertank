import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { adminLogin } from "@/lib/wayet-auth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Shield, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const submit = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      await adminLogin(email, password);
      nav({ to: "/admin" });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const sendReset = async () => {
    setError(""); setInfo("");
    if (!forgotEmail.trim()) return setError("أدخل البريد الإلكتروني");
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setInfo("تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني. تحقّق من البريد.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (e: any) {
      setError(e.message || "تعذّر إرسال رابط الاستعادة");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-4 flex items-center gap-3">
        <Link to="/" className="rounded-full p-2 hover:bg-muted"><ChevronRight className="h-5 w-5" /></Link>
        <h1 className="font-display font-bold text-lg">دخول المدير</h1>
      </header>

      <div className="flex-1 px-6 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold">تسجيل الدخول</h2>
          <p className="text-sm text-muted-foreground mt-2">لوحة إدارة وايت ماء</p>
        </div>

        <div className="space-y-3">
          <input
            type="email" dir="ltr"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@wayet.com"
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none"
          />
          <input
            type="password" dir="ltr"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-emerald-600">{info}</p>}
          <button
            onClick={submit} disabled={loading}
            className="w-full rounded-xl bg-primary px-5 py-4 font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            دخول
          </button>

          {!forgotOpen ? (
            <button
              onClick={() => { setForgotOpen(true); setForgotEmail(email); setError(""); setInfo(""); }}
              className="w-full text-sm text-primary hover:underline"
            >
              نسيت كلمة المرور؟
            </button>
          ) : (
            <div className="rounded-xl border-2 border-input bg-card p-3 space-y-2">
              <p className="text-xs text-muted-foreground">سنرسل لك رابط إعادة تعيين كلمة المرور إلى بريدك.</p>
              <input
                type="email" dir="ltr"
                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="email@wayet.com"
                className="w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={sendReset} disabled={forgotLoading}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {forgotLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  إرسال الرابط
                </button>
                <button
                  onClick={() => { setForgotOpen(false); setError(""); }}
                  className="rounded-lg border-2 border-input px-3 py-2 text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            حسابات المدير تُنشأ من قِبل الإدارة فقط.
          </p>
        </div>
      </div>
    </div>
  );
}
