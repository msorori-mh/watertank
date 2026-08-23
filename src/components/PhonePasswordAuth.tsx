import { useState } from "react";
import { Phone, LockKeyhole, User, Loader2, Eye, EyeOff } from "lucide-react";
import {
  signInWithPhonePassword,
  signUpWithPhonePassword,
} from "@/lib/wayet-auth";

type Portal = "customer" | "driver";

export function PhonePasswordAuth({
  portal,
  onAuthenticated,
}: {
  portal: Portal;
  onAuthenticated: (mode: "login" | "register") => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const driver = portal === "driver";
  const accent = driver ? "bg-[#1a5276]" : "bg-primary";
  const focus = driver ? "focus:border-[#1a5276]" : "focus:border-primary";

  const fullPhone = `+967${localPhone}`;

  const updateLocalPhone = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("00967")) digits = digits.slice(5);
    else if (digits.startsWith("967")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    setLocalPhone(digits.slice(0, 9));
  };

  const submit = async () => {
    setError("");
    if (!/^7\d{8}$/.test(localPhone)) {
      setError("ادخل رقم هاتف صحيح");
      return;
    }
    if (password.length < 8) {
      setError("كلمة المرور يجب ألا تقل عن ٨ أحرف");
      return;
    }
    if (mode === "register") {
      if (!name.trim()) return setError("ادخل الاسم الكامل");
      if (password !== confirm) return setError("كلمتا المرور غير متطابقتين");
      if (!accepted) return setError("يجب الموافقة على الشروط وسياسة الخصوصية");
    }

    setLoading(true);
    try {
      if (mode === "register") {
        await signUpWithPhonePassword(fullPhone, password, name.trim(), portal);
      } else {
        await signInWithPhonePassword(fullPhone, password);
      }
      await onAuthenticated(mode);
    } catch (e: any) {
      setError(e?.message || "تعذّر إكمال العملية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 rounded-2xl bg-muted p-1 mb-7">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          className={`rounded-xl py-3 text-sm font-bold transition ${
            mode === "login" ? "bg-card shadow-sm text-deep" : "text-muted-foreground"
          }`}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); setError(""); }}
          className={`rounded-xl py-3 text-sm font-bold transition ${
            mode === "register" ? "bg-card shadow-sm text-deep" : "text-muted-foreground"
          }`}
        >
          إنشاء حساب
        </button>
      </div>

      <div className="mb-6 text-center">
        <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${
          driver ? "bg-[#1a5276]/10 text-[#1a5276]" : "bg-primary/10 text-primary"
        }`}>
          {mode === "login" ? <LockKeyhole className="h-6 w-6" /> : <User className="h-6 w-6" />}
        </div>
        <h2 className="font-display text-2xl font-bold">
          {mode === "login" ? "أهلاً بعودتك" : `حساب ${driver ? "سائق" : "عميل"} جديد`}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "ادخل رقم هاتفك وكلمة المرور"
            : "لن نرسل رمز تحقق خلال فترة الاختبار المحدود"}
        </p>
      </div>

      <div className="space-y-3">
        {mode === "register" && (
          <div className="relative">
            <User className="absolute right-4 top-4 h-5 w-5 text-muted-foreground" />
            <input
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الكامل"
              className={`w-full rounded-2xl border-2 border-input bg-card py-4 pr-12 pl-4 focus:outline-none ${focus}`}
            />
          </div>
        )}

        <div className="relative" dir="ltr">
          <Phone className="absolute left-4 top-4 z-10 h-5 w-5 text-muted-foreground" />
          <div className={`flex w-full overflow-hidden rounded-2xl border-2 border-input bg-card focus-within:outline-none ${focus}`}>
            <span
              className="flex items-center border-r border-input bg-muted/60 px-4 font-semibold text-deep"
              aria-label="رمز دولة اليمن الثابت"
            >
              +967
            </span>
            <input
              dir="ltr"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={localPhone}
              onChange={(e) => updateLocalPhone(e.target.value)}
              placeholder="7XX XXX XXX"
              maxLength={9}
              aria-label="رقم الهاتف اليمني بدون رمز الدولة"
              className="min-w-0 flex-1 bg-transparent py-4 pr-12 pl-4 text-left focus:outline-none"
            />
          </div>
        </div>

        <div className="relative">
          <LockKeyhole className="absolute right-4 top-4 h-5 w-5 text-muted-foreground" />
          <input
            dir="ltr"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className={`w-full rounded-2xl border-2 border-input bg-card py-4 pr-12 pl-12 text-left focus:outline-none ${focus}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute left-4 top-4 text-muted-foreground"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {mode === "register" && (
          <>
            <div className="relative">
              <LockKeyhole className="absolute right-4 top-4 h-5 w-5 text-muted-foreground" />
              <input
                dir="ltr"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="تأكيد كلمة المرور"
                className={`w-full rounded-2xl border-2 border-input bg-card py-4 pr-12 pl-4 text-left focus:outline-none ${focus}`}
              />
            </div>
            <label className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              أوافق على الشروط وسياسة الخصوصية، وأفهم أن الحساب تجريبي وغير موثّق برسالة هاتف حالياً.
            </label>
          </>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-bold text-white disabled:opacity-60 ${accent}`}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب والمتابعة"}
      </button>

      {mode === "login" && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          نسيت كلمة المرور؟ تواصل مع إدارة الاختبار لإعادة تعيينها.
        </p>
      )}
    </div>
  );
}
