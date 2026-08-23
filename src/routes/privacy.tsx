import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — وايت ماء" },
      { name: "description", content: "سياسة خصوصية تطبيق وايت ماء: البيانات التي نجمعها، طريقة استخدامها، وكيفية حذف الحساب والبيانات." },
      { property: "og:title", content: "سياسة الخصوصية — وايت ماء" },
      { property: "og:description", content: "تعرّف على البيانات التي يجمعها تطبيق وايت ماء وكيفية استخدامها وحذفها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background" dir="rtl">
      <header className="bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 text-white px-5 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Shield className="h-6 w-6" /> سياسة الخصوصية
          </h1>
          <p className="text-sm opacity-90 mt-1">تطبيق وايت ماء — لتوصيل المياه</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-6 text-sm leading-7">
        <Block title="مقدمة">
          <p>
            توضّح هذه السياسة البيانات التي يجمعها تطبيق «وايت ماء» وطريقة استخدامها وحمايتها.
            باستخدامك التطبيق فإنك توافق على ما ورد في هذه السياسة.
          </p>
        </Block>

        <Block title="البيانات التي نجمعها">
          <ul className="list-disc ps-5 space-y-1.5">
            <li><b>رقم الهاتف</b>: أساسي لإنشاء الحساب والتواصل بشأن الطلب.</li>
            <li><b>البريد الإلكتروني</b>: اختياري، يُجمع فقط عند إدخاله أو عند تسجيل الدخول ببريد إلكتروني.</li>
            <li><b>الملف الشخصي</b>: الاسم، المدينة، وتفضيلات الحساب.</li>
            <li><b>العناوين والموقع الجغرافي</b>: تُستخدم إحداثيات الموقع (عند منح الإذن) لتحديد موقع التوصيل بدقة وحفظ العناوين التي تختارها. لا نتتبّع موقعك في الخلفية.</li>
            <li><b>الطلبات</b>: نوع المياه، الكمية، السعر، حالة الطلب وسجل تغيّر الحالة.</li>
            <li><b>بيانات السائق والمركبة</b>: للسائقين فقط — الاسم، الهاتف، المدينة، رقم اللوحة، سعة الوايت، وحالة التوفر.</li>
            <li><b>الإشعارات</b>: رسائل داخل التطبيق مرتبطة بطلباتك وحسابك.</li>
          </ul>
        </Block>

        <Block title="كيف نستخدم البيانات">
          <ul className="list-disc ps-5 space-y-1.5">
            <li>تشغيل الخدمة: إنشاء الطلبات، إسنادها للسائق، والتوصيل.</li>
            <li>الأمن ومنع إساءة الاستخدام وحماية الحسابات.</li>
            <li>الدعم والمساعدة عند وجود مشكلة في الطلب أو الحساب.</li>
          </ul>
          <p className="mt-2">
            لا نستخدم بياناتك لأي غرض آخر، و<b>لا نبيع بياناتك</b> ولا نشاركها مع جهات لأغراض تسويقية.
          </p>
        </Block>

        <Block title="مشاركة البيانات">
          <p>
            تُشارك المعلومات اللازمة لتنفيذ الطلب فقط بين العميل والسائق المسند للطلب (مثل موقع التوصيل ورقم التواصل)،
            ومع فريق الإدارة داخل التطبيق لأغراض التشغيل والدعم. ونستخدم مزوّد خدمة استضافة وقاعدة بيانات
            لتخزين البيانات بشكل آمن.
          </p>
        </Block>

        <Block title="الاحتفاظ بالبيانات وحذفها">
          <p>
            نحتفظ ببياناتك طالما كان حسابك فعّالاً. يمكنك حذف حسابك وبياناتك في أي وقت من داخل التطبيق:
            سجّل الدخول ثم اذهب إلى <b>الإعدادات ← حذف الحساب والبيانات</b>. عند تأكيد الحذف تُحذف بيانات
            الحساب المرتبطة بك نهائياً (الملف الشخصي، العناوين، الطلبات، الإشعارات، وبيانات السائق إن وُجدت).
          </p>
          <p className="mt-2">
            إذا لم يعد التطبيق مثبتاً أو تعذّر تسجيل الدخول، يمكنك تقديم الطلب مباشرةً من نموذج الويب في صفحة{" "}
            <Link to="/account-deletion" className="text-primary font-bold underline">حذف الحساب والبيانات</Link>.
            نتحقق من ملكية رقم الهاتف قبل معالجة الطلب، ولا نكشف عبر النموذج ما إذا كان الرقم مسجلاً.
          </p>
        </Block>

        <Block title="أمان البيانات">
          <p>
            نستخدم اتصالاً مشفّراً (HTTPS) وسياسات وصول على مستوى قاعدة البيانات تضمن أن يرى كل مستخدم
            بياناته الخاصة فقط، مع صلاحيات محدودة لفريق الإدارة بحسب الحاجة التشغيلية.
          </p>
        </Block>

        <Block title="الأطفال">
          <p>التطبيق موجّه للمستخدمين البالغين القادرين على إبرام تعاملات الشراء والتوصيل.</p>
        </Block>

        <Block title="التواصل معنا">
          <p>
            لأي استفسار يتعلق بالخصوصية أو البيانات، يمكنك التواصل معنا عبر
            <b> قسم الدعم داخل التطبيق</b>.
          </p>
        </Block>

        <Block title="تحديثات السياسة">
          <p>قد نحدّث هذه السياسة عند تغيّر وظائف التطبيق، وسيظهر النص المحدّث في هذه الصفحة.</p>
        </Block>

        <div className="pt-2">
          <Link to="/" className="text-primary font-bold text-sm underline">العودة للرئيسية</Link>
        </div>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4">
      <h2 className="font-display font-bold text-base mb-2">{title}</h2>
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}
