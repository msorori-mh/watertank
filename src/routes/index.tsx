import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Shield, Droplets } from "lucide-react";
import { Logo } from "@/components/Logo";

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
  const cards = [
    {
      to: "/customer/login" as const,
      title: "عميل",
      desc: "اطلب وايت ماء، تتبع طلبك، واحفظ عناوينك المفضّلة.",
      cta: "دخول العميل",
      icon: Shield,
      style: "bg-card border-2 border-primary/15 text-deep",
      iconWrap: "bg-primary/10 text-primary",
      ctaCls: "text-primary",
    },
    {
      to: "/driver/login" as const,
      title: "سائق",
      desc: "استلم طلباتك، وصّل الماء، وتابع أرباحك.",
      cta: "دخول السائق",
      icon: Truck,
      style: "bg-[#1a5276] text-white border-2 border-transparent",
      iconWrap: "bg-white/15 text-white",
      ctaCls: "text-white",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] via-background to-background font-body text-deep flex flex-col">
      <header className="px-6 pt-10 pb-8 text-center max-w-3xl mx-auto">
        <div className="flex justify-center mb-4">
          <Logo size={72} />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <Droplets className="h-3.5 w-3.5" /> منصة وايت ماء — اليمن
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold leading-tight md:text-5xl">
          مياه عذبة تصلك
          <br />
          <span className="text-primary">في أقل من ساعة</span>
        </h1>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          اختر بوابتك للدخول
        </p>
      </header>

      <main className="flex-1 px-6 pb-12">
        <div className="w-full max-w-3xl mx-auto grid gap-5 md:grid-cols-2">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                className={`group relative overflow-hidden rounded-3xl p-7 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-glow)] ${c.style}`}
              >
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${c.iconWrap}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h2 className="mt-5 font-display text-2xl font-bold">{c.title}</h2>
                <p className={`mt-2 text-sm ${c.style.includes("text-white") ? "text-white/85" : "text-muted-foreground"}`}>
                  {c.desc}
                </p>
                <span className={`mt-6 inline-flex items-center gap-1 text-sm font-semibold ${c.ctaCls}`}>
                  {c.cta} ←
                </span>
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} وايت ماء • مأرب وكل اليمن
      </footer>
    </div>
  );
}
