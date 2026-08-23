import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "طلب حذف الحساب والبيانات — وايت ماء" },
      { name: "description", content: "اطلب حذف حسابك وبياناتك في تطبيق وايت ماء من الويب، حتى إذا لم يعد التطبيق مثبتاً على جهازك." },
      { property: "og:title", content: "طلب حذف الحساب والبيانات — وايت ماء" },
      { property: "og:description", content: "مسار ويب رسمي لطلب حذف حساب وايت ماء والبيانات المرتبطة به." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountDeletionPage,
});

function AccountDeletionPage() {
  const [localPhone, setLocalPhone] = useState("");
  const [requesterType, setRequesterType] = useState<"customer" | "driver">("customer");
  const [reason, setReason] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const updatePhone = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("00967")) digits = digits.slice(5);
    else if (digits.startsWith("967")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    setLocalPhone(digits.slice(0, 9));
  };

  const submitRequest = async () => {
    setError("");
    if (!/^7\d{8}$/.test(localPhone)) {
      setError("أدخل رقم هاتف يمني صحيحاً من 9 أرقام يبدأ بالرقم 7.");
      return;
    }
    if (!accepted) {
      setError("يجب تأكيد ملكية رقم الهاتف وفهم أن الحذف نهائي.");
      return;
    }

    setLoading(true);
    const { error: requestError } = await supabase.rpc(
      "request_account_deletion" as any,
      {
        _phone: `+967${localPhone}`,
        _requester_type: requesterType,
        _reason: reason.trim() || null,
      } as any,
    );
    setLoading(false);

    if (requestError) {
      setError("تعذّر إرسال الطلب حالياً. حاول مرة أخرى لاحقاً.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background" dir="rtl">
      <header className="bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 text-white px-5 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Trash2 className="h-6 w-6" /> حذف الحساب والبيانات
          </h1>
          <p className="text-sm opacity-90 mt-1">تطبيق وايت ماء — app.wayetmaa.mobile</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5 text-sm leading-7">
        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
          <h2 className="font-display font-bold text-lg mb-2">طلب الحذف عبر الويب</h2>
          <p className="text-muted-foreground mb-4">
            استخدم هذا النموذج إذا حذفت التطبيق أو لا تستطيع تسجيل الدخول. سنراجع ملكية الرقم قبل تنفيذ الحذف.
            إرسال الطلب لا يتطلب تثبيت التطبيق.
          </p>

          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <h3 className="mt-3 font-bold text-emerald-800">تم استلام طلبك</h3>
              <p className="mt-1 text-xs text-emerald-700">
                سيتحقق فريق وايت ماء من ملكية الرقم ثم يحذف الحساب والبيانات المرتبطة به. إذا كان هناك طلب سابق مفتوح فلن يُنشأ طلب مكرر.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground">نوع الحساب</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setRequesterType("customer")}
                    className={`rounded-xl border-2 py-2.5 font-bold ${requesterType === "customer" ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                    عميل
                  </button>
                  <button type="button" onClick={() => setRequesterType("driver")}
                    className={`rounded-xl border-2 py-2.5 font-bold ${requesterType === "driver" ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                    سائق
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">رقم الهاتف المرتبط بالحساب</label>
                <div className="mt-1 flex overflow-hidden rounded-xl border-2 border-input bg-background" dir="ltr">
                  <span className="flex items-center border-r border-input bg-muted px-4 font-bold">+967</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={localPhone}
                    onChange={(event) => updatePhone(event.target.value)}
                    placeholder="7XX XXX XXX"
                    maxLength={9}
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-left focus:outline-none"
                    aria-label="رقم الهاتف اليمني بدون رمز الدولة"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">ملاحظة اختيارية</label>
                <textarea value={reason} onChange={(event) => setReason(event.target.value.slice(0, 500))}
                  rows={3} maxLength={500} placeholder="اذكر سبب تعذر الحذف من داخل التطبيق إن رغبت"
                  className="mt-1 w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              <label className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary" />
                <span>أؤكد أن الرقم يخص حسابي، وأفهم أن حذف الحساب والبيانات إجراء نهائي لا يمكن التراجع عنه.</span>
              </label>

              {error && <p className="rounded-xl bg-destructive/10 p-3 text-destructive">{error}</p>}

              <button type="button" onClick={submitRequest} disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive px-4 py-3.5 font-bold text-destructive-foreground disabled:opacity-60">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                إرسال طلب حذف الحساب
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4">
          <h2 className="font-display font-bold text-base mb-2">الحذف الفوري من داخل التطبيق</h2>
          <ol className="list-decimal ps-5 space-y-2 text-muted-foreground">
            <li>سجّل الدخول إلى حساب العميل أو السائق.</li>
            <li>افتح <b>الإعدادات ← حذف الحساب والبيانات</b>.</li>
            <li>اكتب عبارة <b>حذف حسابي</b> ثم أكّد الحذف النهائي.</li>
            <li>تُحذف البيانات ويخرجك التطبيق تلقائياً.</li>
          </ol>
        </section>

        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4">
          <h2 className="font-display font-bold text-base mb-2">البيانات المشمولة</h2>
          <ul className="list-disc ps-5 space-y-1.5 text-muted-foreground">
            <li>حساب الدخول والملف الشخصي ورقم الهاتف والبريد إن وُجد.</li>
            <li>العناوين وإحداثيات مواقع التوصيل.</li>
            <li>الطلبات وسجل حالاتها والإشعارات.</li>
            <li>بيانات السائق والمركبة وطلبات المستحقات عند انطباقها.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            الحذف نهائي. قد نحتفظ فقط بسجلات مجهولة الهوية إذا كان الاحتفاظ مطلوباً قانونياً، دون معلومات تحدد هويتك.
          </p>
        </section>

        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4">
          <h2 className="font-display font-bold text-base mb-2">روابط مهمة</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/customer/login" className="rounded-xl bg-primary py-2.5 text-center font-bold text-primary-foreground">دخول العميل</Link>
            <Link to="/driver/login" className="rounded-xl border-2 border-primary/20 py-2.5 text-center font-bold text-primary">دخول السائق</Link>
            <Link to="/privacy" className="rounded-xl border border-border py-2.5 text-center font-bold">سياسة الخصوصية</Link>
            <Link to="/" className="rounded-xl border border-border py-2.5 text-center font-bold">العودة إلى وايت ماء</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
