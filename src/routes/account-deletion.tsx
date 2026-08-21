import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "حذف الحساب والبيانات — وايت ماء" },
      { name: "description", content: "خطوات حذف حسابك وبياناتك نهائياً من تطبيق وايت ماء عبر الإعدادات داخل التطبيق." },
      { property: "og:title", content: "حذف الحساب والبيانات — وايت ماء" },
      { property: "og:description", content: "طريقة طلب حذف الحساب والبيانات في تطبيق وايت ماء خلال دقيقة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountDeletionPage,
});

function AccountDeletionPage() {
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
        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4">
          <h2 className="font-display font-bold text-base mb-2">خطوات الحذف</h2>
          <ol className="list-decimal ps-5 space-y-2 text-muted-foreground">
            <li>سجّل الدخول إلى حسابك في التطبيق (عميل أو سائق).</li>
            <li>افتح صفحة <b>الإعدادات</b>.</li>
            <li>انزل إلى قسم <b>حذف الحساب والبيانات</b> واضغط «طلب حذف الحساب».</li>
            <li>اكتب عبارة التأكيد <b>حذف حسابي</b>، ثم أكّد الحذف النهائي.</li>
            <li>يتم حذف الحساب وبياناته مباشرة ويُخرجك التطبيق تلقائياً.</li>
          </ol>
        </section>

        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4">
          <h2 className="font-display font-bold text-base mb-2">ما البيانات التي تُحذف؟</h2>
          <ul className="list-disc ps-5 space-y-1.5 text-muted-foreground">
            <li>الملف الشخصي: الاسم، رقم الهاتف، البريد الإلكتروني إن وُجد، والمدينة.</li>
            <li>العناوين المحفوظة وإحداثيات مواقع التوصيل.</li>
            <li>الطلبات وسجل حالاتها المرتبطة بحسابك.</li>
            <li>الإشعارات الخاصة بك.</li>
            <li>بيانات السائق والمركبة وطلبات المستحقات (لحساب السائق).</li>
            <li>حساب الدخول نفسه، بحيث لا يمكن تسجيل الدخول به بعد الحذف.</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            الحذف نهائي ولا يمكن التراجع عنه. قد تُحفظ سجلات محاسبية مجهولة الهوية دون بياناتك الشخصية
            عند وجود إلزام قانوني.
          </p>
        </section>

        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4">
          <h2 className="font-display font-bold text-base mb-2">روابط سريعة</h2>
          <div className="grid gap-2">
            <Link to="/customer/login" className="rounded-xl bg-primary text-primary-foreground font-bold py-2.5 text-center">
              تسجيل دخول العميل
            </Link>
            <Link to="/driver/login" className="rounded-xl border-2 border-primary/20 text-primary font-bold py-2.5 text-center">
              تسجيل دخول السائق
            </Link>
            <Link to="/privacy" className="rounded-xl border border-border font-bold py-2.5 text-center">
              سياسة الخصوصية
            </Link>
          </div>
          <p className="text-muted-foreground text-xs mt-3">
            إذا لم تستطع الدخول إلى حسابك، تواصل معنا عبر <b>قسم الدعم داخل التطبيق</b>.
          </p>
        </section>

        <Link to="/" className="text-primary font-bold text-sm underline inline-block">العودة للرئيسية</Link>
      </main>
    </div>
  );
}
