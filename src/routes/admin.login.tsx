import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { adminLogin, adminSignup } from "@/lib/wayet-auth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Shield, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "login") await adminLogin(email, password);
      else await adminSignup(email, password, name, setupCode);
      nav({ to: "/admin" });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
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
          <h2 className="font-display text-2xl font-bold">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب مدير"}</h2>
          <p className="text-sm text-muted-foreground mt-2">لوحة إدارة وايت ماء</p>
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الكامل"
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none"
            />
          )}
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
          {mode === "signup" && (
            <input
              dir="ltr"
              value={setupCode} onChange={(e) => setSetupCode(e.target.value)}
              placeholder="رمز إعداد المدير"
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none"
            />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            onClick={submit} disabled={loading}
            className="w-full rounded-xl bg-primary px-5 py-4 font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "دخول" : "إنشاء الحساب"}
          </button>
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            className="w-full text-sm text-muted-foreground hover:text-deep"
          >
            {mode === "login" ? "ليس لديك حساب؟ إنشاء حساب جديد" : "لدي حساب — تسجيل الدخول"}
          </button>
        </div>
      </div>
    </div>
  );
}
