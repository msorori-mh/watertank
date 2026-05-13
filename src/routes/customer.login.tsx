import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Phone, KeyRound, Loader2 } from "lucide-react";
import { sendOtp, verifyOtpAndLogin, DEMO_OTP_CODE } from "@/lib/wayet-auth";
import { signInWithGoogle } from "@/lib/google-auth";

export const Route = createFileRoute("/customer/login")({
  component: CustomerLogin,
});

function CustomerLogin() {
  const nav = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+967");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    setError(""); setLoading(true);
    try {
      if (!/^\+?\d{9,15}$/.test(phone.replace(/\s/g, "")))
        throw new Error("ادخل رقم هاتف صحيح");
      await sendOtp(phone);
      setStep("otp");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setError(""); setLoading(true);
    try {
      const res = await verifyOtpAndLogin(phone, code.trim());
      nav({ to: res.isAdmin ? "/admin" : "/customer" });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-4 flex items-center gap-3">
        <Link to="/" className="rounded-full p-2 hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </Link>
        <h1 className="font-display font-bold text-lg">دخول العميل</h1>
      </header>

      <div className="flex-1 px-6 flex flex-col justify-center max-w-md mx-auto w-full">
        {step === "phone" ? (
          <>
            <div className="mb-8 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <Phone className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold">رقم هاتفك</h2>
              <p className="text-sm text-muted-foreground mt-2">
                سنرسل لك رمز التحقق عبر رسالة قصيرة
              </p>
            </div>
            <input
              dir="ltr"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+967 7XX XXX XXX"
              className="w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-lg font-medium focus:border-primary focus:outline-none"
            />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              إرسال رمز التحقق
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> أو <div className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={async () => {
                setError(""); setLoading(true);
                try { await signInWithGoogle("customer"); }
                catch (e: any) { setError(e.message); setLoading(false); }
              }}
              disabled={loading}
              className="w-full rounded-2xl border-2 border-input bg-card px-5 py-4 font-bold text-deep disabled:opacity-60 flex items-center justify-center gap-3"
            >
              <svg className="h-5 w-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.8-5.3l-6.4-5.4C29.4 34.7 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.4 5.4C41.9 35.5 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              تسجيل الدخول باستخدام Google
            </button>
          </>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <KeyRound className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold">أدخل الرمز</h2>
              <p className="text-sm text-muted-foreground mt-2">
                أرسلنا رمزاً مكوناً من ٤ أرقام إلى <span dir="ltr">{phone}</span>
              </p>
              <div className="mt-3 inline-block rounded-lg bg-accent/30 px-3 py-1 text-xs font-semibold text-deep">
                رمز تجريبي: {DEMO_OTP_CODE}
              </div>
            </div>
            <input
              dir="ltr"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••"
              className="w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-3xl font-bold text-center tracking-[0.5em] focus:border-primary focus:outline-none"
            />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={loading || code.length < 4}
              className="mt-6 w-full rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              تأكيد ودخول
            </button>
            <button
              onClick={() => { setStep("phone"); setCode(""); setError(""); }}
              className="mt-3 w-full text-sm text-muted-foreground hover:text-deep"
            >
              تعديل الرقم
            </button>
          </>
        )}
      </div>
    </div>
  );
}
