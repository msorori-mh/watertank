import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Shield, Droplets } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background font-body text-deep flex flex-col">
      <header className="px-6 pt-10 pb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <Droplets className="h-3.5 w-3.5" /> منصة وايت ماء — اليمن
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold leading-tight md:text-5xl">
          مياه عذبة تصلك
          <br />
          <span className="text-primary">في أقل من ساعة</span>
        </h1>
        <p className="mt-4 mx-auto max-w-md text-sm text-muted-foreground md:text-base">
          اطلب وايت الماء بسهولة، أو ادخل لإدارة الطلبات والسائقين.
        </p>
      </header>

      <main className="flex-1 px-6 pb-12 flex items-center justify-center">
        <div className="w-full max-w-2xl grid gap-5 md:grid-cols-2">
          <Link
            to="/customer/login"
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-8 text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-1"
          >
            <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <Truck className="h-7 w-7" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold">عميل</h2>
              <p className="mt-2 text-sm text-white/90">
                اطلب وايت ماء، تتبع طلبك، واحفظ عناوينك المفضلة.
              </p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">
                دخول العميل ←
              </span>
            </div>
          </Link>

          <Link
            to="/admin/login"
            className="group relative overflow-hidden rounded-3xl border-2 border-primary/15 bg-card p-8 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-1"
          >
            <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            <div className="relative">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold">مدير</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                لوحة الإدارة: متابعة الطلبات، السائقين، المدن والأسعار.
              </p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                دخول المدير ←
              </span>
            </div>
          </Link>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} وايت ماء • صنع لمدينة مأرب وكل اليمن
      </footer>
    </div>
  );
}
