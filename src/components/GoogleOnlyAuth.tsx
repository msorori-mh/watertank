import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signInWithGoogle, type PendingRole } from "@/lib/google-auth";

export function GoogleOnlyAuth({ portal }: { portal: PendingRole }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const driver = portal === "driver";

  const login = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle(portal);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذّر تسجيل الدخول عبر Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-center">
      <div className="mb-7">
        <h2 className="font-display text-2xl font-bold">الدخول إلى حساب {driver ? "السائق" : "العميل"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          اختر حساب Google، ثم أكمل رقم الهاتف والعنوان والموقع عند أول دخول.
        </p>
      </div>
      <button
        type="button"
        onClick={login}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-input bg-white px-5 py-4 font-bold text-slate-800 shadow-sm disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z" />
            <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9.1L6.5 14Z" />
            <path fill="#EA4335" d="M12 5.9c1.5 0 2.9.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7.5l3.4 2.6A5.9 5.9 0 0 1 12 5.9Z" />
          </svg>
        )}
        المتابعة باستخدام Google
      </button>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية.
      </p>
    </div>
  );
}
