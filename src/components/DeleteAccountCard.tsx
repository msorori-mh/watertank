import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/wayet-auth";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

export const DELETE_CONFIRM_PHRASE = "حذف حسابي";

export function DeleteAccountCard() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [finalStep, setFinalStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (loading) return;
    setOpen(false);
    setPhrase("");
    setFinalStep(false);
    setError("");
  };

  const runDelete = async () => {
    setError("");
    if (phrase.trim() !== DELETE_CONFIRM_PHRASE) {
      setError(`الرجاء كتابة العبارة "${DELETE_CONFIRM_PHRASE}" بشكل مطابق`);
      return;
    }
    setLoading(true);
    const { error: e } = await supabase.rpc("delete_my_account" as any);
    if (e) {
      setLoading(false);
      setError(e.message || "تعذّر حذف الحساب، حاول مرة أخرى");
      return;
    }
    await signOut();
    setLoading(false);
    nav({ to: "/" });
  };

  return (
    <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4 border border-destructive/20">
      <h2 className="font-display font-bold text-sm flex items-center gap-2 text-destructive">
        <span className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4" />
        </span>
        حذف الحساب والبيانات
      </h2>
      <p className="text-[11px] text-muted-foreground mt-2 leading-5">
        حذف الحساب إجراء نهائي ولا يمكن التراجع عنه. سيتم حذف ملفك الشخصي، عناوينك،
        طلباتك، إشعاراتك، وبياناتك المرتبطة بالتطبيق بشكل دائم.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl bg-destructive/10 text-destructive border border-destructive/30 py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition"
      >
        <Trash2 className="h-4 w-4" /> طلب حذف الحساب
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={close}>
          <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-base text-destructive">تأكيد حذف الحساب</h3>
              <button onClick={close} className="p-1.5 rounded-lg hover:bg-muted" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!finalStep ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-5">
                  لتأكيد الحذف النهائي، اكتب العبارة التالية في الحقل أدناه:
                  <span className="font-bold text-foreground"> {DELETE_CONFIRM_PHRASE}</span>
                </p>
                <input
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder={DELETE_CONFIRM_PHRASE}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                />
                {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}
                <button
                  type="button"
                  onClick={() => {
                    if (phrase.trim() !== DELETE_CONFIRM_PHRASE) {
                      setError(`الرجاء كتابة العبارة "${DELETE_CONFIRM_PHRASE}" بشكل مطابق`);
                      return;
                    }
                    setError("");
                    setFinalStep(true);
                  }}
                  className="w-full rounded-2xl bg-destructive text-destructive-foreground font-bold py-3 active:scale-[0.98] transition"
                >
                  متابعة
                </button>
                <button type="button" onClick={close} className="w-full rounded-2xl border border-border py-2.5 text-sm font-semibold">
                  إلغاء
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold">هل أنت متأكد تماماً؟</p>
                <p className="text-xs text-muted-foreground leading-5">
                  سيتم حذف حسابك وجميع بياناتك نهائياً، ولن تتمكن من استعادتها لاحقاً.
                </p>
                {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}
                <button
                  type="button"
                  onClick={runDelete}
                  disabled={loading}
                  className="w-full rounded-2xl bg-destructive text-destructive-foreground font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  نعم، احذف حسابي نهائياً
                </button>
                <button type="button" onClick={() => setFinalStep(false)} disabled={loading} className="w-full rounded-2xl border border-border py-2.5 text-sm font-semibold">
                  رجوع
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
