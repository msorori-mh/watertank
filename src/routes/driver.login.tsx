import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Phone, KeyRound, Loader2 } from "lucide-react";
import { sendOtp, verifyOtpAndLogin, DEMO_OTP_CODE } from "@/lib/wayet-auth";
import { signInWithGoogle } from "@/lib/google-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/driver/login")({
  component: DriverLogin,
});

function DriverLogin() {
  const nav = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+967");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setError(""); setLoading(true);
    try {
      if (!/^\+?\d{9,15}$/.test(phone.replace(/\s/g, ""))) throw new Error("ادخل رقم هاتف صحيح");
      await sendOtp(phone);
      setStep("otp");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    setError(""); setLoading(true);
    try {
      const { user } = await verifyOtpAndLogin(phone, code.trim());
      // Check if driver row exists
      const { data: d } = await supabase.from("drivers").select("id").eq("user_id", user!.id).maybeSingle();
      nav({ to: d ? "/driver" : "/driver/register" });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-4 flex items-center gap-3">
        <Link to="/" className="rounded-full p-2 hover:bg-muted"><ChevronRight className="h-5 w-5" /></Link>
        <h1 className="font-display font-bold text-lg">دخول السائق</h1>
      </header>

      <div className="flex-1 px-6 flex flex-col justify-center max-w-md mx-auto w-full">
        {step === "phone" ? (
          <>
            <div className="mb-8 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a5276]/10 mb-4">
                <Phone className="h-7 w-7 text-[#1a5276]" />
              </div>
              <h2 className="font-display text-2xl font-bold">رقم هاتفك</h2>
              <p className="text-sm text-muted-foreground mt-2">سنرسل رمز التحقق عبر رسالة قصيرة</p>
            </div>
            <input dir="ltr" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+967 7XX XXX XXX"
              className="w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-lg font-medium focus:border-[#1a5276] focus:outline-none" />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button onClick={send} disabled={loading}
              className="mt-6 w-full rounded-2xl bg-[#1a5276] px-5 py-4 font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              إرسال رمز التحقق
            </button>
          </>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a5276]/10 mb-4">
                <KeyRound className="h-7 w-7 text-[#1a5276]" />
              </div>
              <h2 className="font-display text-2xl font-bold">أدخل الرمز</h2>
              <p className="text-sm text-muted-foreground mt-2">أرسلنا رمزاً مكوناً من ٤ أرقام إلى <span dir="ltr">{phone}</span></p>
              <div className="mt-3 inline-block rounded-lg bg-accent/30 px-3 py-1 text-xs font-semibold text-deep">
                رمز تجريبي: {DEMO_OTP_CODE}
              </div>
            </div>
            <input dir="ltr" inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="••••"
              className="w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-3xl font-bold text-center tracking-[0.5em] focus:border-[#1a5276] focus:outline-none" />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button onClick={verify} disabled={loading || code.length < 4}
              className="mt-6 w-full rounded-2xl bg-[#1a5276] px-5 py-4 font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              تأكيد ودخول
            </button>
            <button onClick={() => { setStep("phone"); setCode(""); setError(""); }}
              className="mt-3 w-full text-sm text-muted-foreground hover:text-deep">تعديل الرقم</button>
          </>
        )}
      </div>
    </div>
  );
}
