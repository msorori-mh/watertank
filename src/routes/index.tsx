import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Home, Droplets, MapPin, ReceiptText, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useSessionRestore } from "@/lib/session-restore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "وايت ماء — توصيل المياه في اليمن" },
      { name: "description", content: "اطلب وايت ماء إلى موقعك، اعرف السعر، وتابع حالة التوصيل." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const restoring = useSessionRestore();

  if (restoring) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <div className="mx-auto h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground">جارٍ استعادة جلستك…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] bg-gradient-to-b from-[#edf9ff] via-background to-background font-body text-deep flex flex-col overflow-y-auto">
      <header className="w-full shrink-0 px-5 pt-3 pb-2 text-center max-w-4xl mx-auto sm:px-6 sm:pt-6 sm:pb-4">
        <div className="flex justify-center mb-1.5 sm:mb-3">
          <span className="sm:hidden"><Logo size={46} /></span>
          <span className="hidden sm:inline"><Logo size={64} /></span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary sm:text-xs">
          <Droplets className="h-3.5 w-3.5" /> منصة وايت ماء — اليمن
        </div>
        <h1 className="mt-2 font-display text-[1.65rem] font-extrabold leading-tight sm:mt-3 sm:text-4xl md:text-5xl">
          اطلب وايت ماء إلى موقعك
          <br />
          <span className="text-primary">بخطوات واضحة وسريعة</span>
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground sm:mt-3 sm:text-sm">
          حدّد عنوانك، اعرف السعر، وتابع طلبك حتى يصل إليك
        </p>
      </header>

      <main className="flex min-h-0 flex-1 items-center px-4 py-2 sm:px-6 sm:pb-8">
        <div className="w-full max-w-4xl mx-auto grid gap-3 md:grid-cols-[1.35fr_.65fr] md:gap-5">
          <section className="rounded-3xl border-2 border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
                <Home className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-primary">للعملاء</p>
                <h2 className="font-display text-lg font-extrabold sm:text-2xl">اطلب الماء الآن</h2>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Step icon={MapPin} label="حدّد موقعك" />
              <Step icon={ReceiptText} label="اعرف السعر" />
              <Step icon={RouteIcon} label="تابع الطلب" />
            </div>

            <Link to="/customer/login" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[.98] sm:mt-5 sm:text-base">
              المتابعة كعميل بحساب Google
            </Link>
            <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> دفع نقدي عند الاستلام • تسجيل آمن عبر Google
            </p>
          </section>

          <Link to="/driver/login" className="group flex items-center gap-3 rounded-2xl bg-[#1a5276] p-3.5 text-white shadow-[var(--shadow-soft)] transition active:scale-[.98] md:flex-col md:items-start md:justify-center md:rounded-3xl md:p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 md:h-14 md:w-14 md:rounded-2xl">
              <Truck className="h-5 w-5 md:h-7 md:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white/70 md:text-xs">لأصحاب الوايتات</p>
              <h2 className="font-display text-base font-bold md:mt-1 md:text-2xl">دخول السائق</h2>
              <p className="mt-0.5 text-[11px] text-white/80 md:mt-2 md:text-sm">استقبل الطلبات وتابع رحلات التوصيل</p>
            </div>
            <span className="shrink-0 text-sm font-bold md:mt-3">بحساب Google ←</span>
          </Link>
        </div>
      </main>

      <footer className="shrink-0 px-5 py-2 text-center text-[10px] text-muted-foreground sm:px-6 sm:py-6 sm:text-xs">
        © {new Date().getFullYear()} وايت ماء • سيستراك للأنظمة والحلول الرقمية{" "}
        <a href="https://systrac.lovable.app" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:underline">
          SysTrac
        </a>
      </footer>
    </div>
  );
}

function Step({ icon: Icon, label }: { icon: typeof MapPin; label: string }) {
  return (
    <div className="rounded-xl bg-sky-50 px-1.5 py-2 text-deep sm:py-3">
      <Icon className="mx-auto h-4 w-4 text-primary sm:h-5 sm:w-5" />
      <p className="mt-1 text-[10px] font-bold sm:text-xs">{label}</p>
    </div>
  );
}
