import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Home, Droplets } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useSessionRestore } from "@/lib/session-restore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "وايت ماء — توصيل المياه في اليمن" },
      { name: "description", content: "اطلب وايت ماء في أقل من ساعة. سجّل الدخول كعميل أو سائق." },
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

  const cards = [
    {
      to: "/customer/login" as const,
      title: "عميل",
      desc: "اطلب وايت ماء، تتبع طلبك، واحفظ عناوينك المفضّلة.",
      cta: "دخول أو إنشاء حساب",
      icon: Home,
      style: "bg-card border-2 border-primary/15 text-deep",
      iconWrap: "bg-primary/10 text-primary",
      ctaCls: "text-primary",
    },
    {
      to: "/driver/login" as const,
      title: "سائق",
      desc: "استلم الطلبات، وصّل الماء، وتابع حالة التوصيل.",
      cta: "دخول أو إنشاء حساب",
      icon: Truck,
      style: "bg-[#1a5276] text-white border-2 border-transparent",
      iconWrap: "bg-white/15 text-white",
      ctaCls: "text-white",
    },
  ];

  return (
    <div className="min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] bg-gradient-to-b from-[#f0f9ff] via-background to-background font-body text-deep flex flex-col overflow-y-auto">
      <header className="w-full shrink-0 px-5 pt-3 pb-2 text-center max-w-3xl mx-auto sm:px-6 sm:pt-7 sm:pb-6">
        <div className="flex justify-center mb-2 sm:mb-4">
          <span className="sm:hidden"><Logo size={52} /></span>
          <span className="hidden sm:inline"><Logo size={72} /></span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <Droplets className="h-3.5 w-3.5" /> منصة وايت ماء — اليمن
        </div>
        <h1 className="mt-2 font-display text-[1.75rem] font-bold leading-tight sm:mt-4 sm:text-4xl md:text-5xl">
          مياه عذبة تصلك
          <br />
          <span className="text-primary">في أقل من ساعة</span>
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground sm:mt-4 sm:text-sm md:text-base">
          اختر بوابتك للدخول
        </p>
      </header>

      <main className="flex min-h-0 flex-1 items-center px-5 py-2 sm:px-6 sm:pb-12">
        <div className="w-full max-w-3xl mx-auto grid gap-2.5 sm:gap-5 md:grid-cols-2">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                className={`group relative overflow-hidden rounded-2xl p-3.5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-glow)] sm:rounded-3xl sm:p-6 ${c.style}`}
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl ${c.iconWrap}`}>
                  <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <h2 className="mt-2 font-display text-lg font-bold sm:mt-4 sm:text-2xl">{c.title}</h2>
                <p className={`mt-0.5 text-xs leading-5 sm:mt-2 sm:text-sm ${c.style.includes("text-white") ? "text-white/85" : "text-muted-foreground"}`}>
                  {c.desc}
                </p>
                <span className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold sm:mt-5 sm:text-sm ${c.ctaCls}`}>
                  {c.cta} ←
                </span>
              </Link>
            );
          })}
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
