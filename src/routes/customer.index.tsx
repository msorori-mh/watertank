import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/wayet-auth";
import {
  Plus,
  Truck,
  Clock,
  CheckCircle2,
  MapPin,
  LogOut,
  ChevronLeft,
  Droplets,
  Wallet,
  BarChart3,
  Settings,
  Sparkles,
  Navigation,
} from "lucide-react";
import { NotificationsCenter } from "@/components/NotificationsCenter";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";

export const Route = createFileRoute("/customer/")({
  component: CustomerHome,
});

type Order = {
  id: string;
  city: string;
  capacity: number;
  water_type: string;
  status: string;
  price: number;
  created_at: string;
};

const STATUS_LABEL: Record<
  string,
  { text: string; chip: string; ring: string; icon: any; progress: number }
> = {
  pending:     { text: "قيد المراجعة",    chip: "bg-amber-100 text-amber-700",     ring: "from-amber-400 to-orange-400",   icon: Clock,        progress: 10 },
  approved:    { text: "تم القبول",       chip: "bg-sky-100 text-sky-700",         ring: "from-sky-400 to-cyan-400",       icon: CheckCircle2, progress: 25 },
  assigned:    { text: "تم تعيين سائق",   chip: "bg-blue-100 text-blue-700",       ring: "from-blue-400 to-cyan-400",      icon: Truck,        progress: 40 },
  on_the_way:  { text: "في الطريق إليك",  chip: "bg-cyan-100 text-cyan-700",       ring: "from-cyan-400 to-teal-400",      icon: Truck,        progress: 65 },
  arrived:     { text: "وصل الموقع",      chip: "bg-teal-100 text-teal-700",       ring: "from-teal-400 to-emerald-400",   icon: MapPin,       progress: 85 },
  delivering:  { text: "بدأ الصب",        chip: "bg-emerald-100 text-emerald-700", ring: "from-emerald-400 to-green-400",  icon: Droplets,     progress: 95 },
  completed:   { text: "تم التسليم",      chip: "bg-emerald-100 text-emerald-700", ring: "from-emerald-400 to-green-500",  icon: CheckCircle2, progress: 100 },
  cancelled:   { text: "ملغى",            chip: "bg-rose-100 text-rose-700",       ring: "from-rose-400 to-red-400",       icon: Clock,        progress: 0 },
};

const ACTIVE_STATUSES = new Set([
  "pending", "approved", "assigned", "on_the_way", "arrived", "delivering",
]);

function getGreeting(h: number) {
  if (h < 5) return "مساء الخير";
  if (h < 12) return "صباح الخير";
  if (h < 18) return "مساء الخير";
  return "مساء الخير";
}

function CustomerHome() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) nav({ to: "/customer/login" });
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { nav({ to: "/customer/login" }); return; }
      setUser(data.session.user);
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: ords }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("orders").select("id,city,capacity,water_type,status,price,created_at")
          .eq("customer_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setProfile(prof);
      setOrders(ords || []);
      setLoading(false);
    })();
  }, [user]);

  const handleSignOut = async () => { await signOut(); nav({ to: "/" }); };

  const [greeting, setGreeting] = useState("صباح الخير");
  useEffect(() => { setGreeting(getGreeting(new Date().getHours())); }, []);
  const displayName = useMemo(() => {
    const raw = profile?.full_name || profile?.name || profile?.phone || profile?.email || "بك";
    return String(raw).split("@")[0];
  }, [profile]);

  const activeOrder = useMemo(
    () => orders.find((o) => ACTIVE_STATUSES.has(o.status)),
    [orders],
  );
  const pastOrders = useMemo(
    () => orders.filter((o) => o.id !== activeOrder?.id),
    [orders, activeOrder],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background pb-24">
      {/* ===== HERO ===== */}
      <header className="relative overflow-hidden px-5 pt-8 pb-16 rounded-b-[2.5rem] text-white shadow-[0_20px_60px_-15px_rgba(8,114,182,0.45)]">
        {/* gradient + water shapes */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0891b2_0%,#0284c7_45%,#1e3a8a_100%)]" />
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="absolute top-10 left-1/3 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <svg className="absolute inset-x-0 bottom-0 w-full opacity-20" viewBox="0 0 400 80" preserveAspectRatio="none">
          <path d="M0,40 C100,80 200,0 400,40 L400,80 L0,80 Z" fill="white" />
        </svg>

        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] tracking-wide opacity-90 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> {greeting}
              </p>
              <h1 className="font-display text-2xl font-extrabold mt-0.5 truncate">
                {displayName} 👋
              </h1>
              <p className="text-xs opacity-80 mt-1">المياه العذبة على بُعد طلب واحد.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {user && <NotificationsCenter userId={user.id} variant="dark" />}
              <button
                onClick={handleSignOut}
                aria-label="تسجيل الخروج"
                className="rounded-full p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 transition border border-white/15 backdrop-blur"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Primary CTA */}
          <Link
            to="/customer/order"
            className="group relative mt-7 block rounded-3xl overflow-hidden bg-white text-foreground shadow-[0_20px_50px_-15px_rgba(2,132,199,0.55)] active:scale-[0.985] transition-transform duration-200"
          >
            <div className="absolute -top-10 -left-8 h-32 w-32 rounded-full bg-cyan-200/60 blur-2xl" />
            <div className="absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-sky-200/70 blur-2xl" />
            <div className="relative flex items-center gap-4 p-5">
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shrink-0">
                <Droplets className="h-8 w-8 text-white" />
                <span className="absolute inset-0 rounded-2xl ring-2 ring-cyan-300/50 animate-ripple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-extrabold text-lg leading-tight">اطلب وايت ماء الآن</p>
                <p className="text-xs text-muted-foreground mt-1">توصيل سريع إلى موقعك</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-700 text-white flex items-center justify-center group-hover:translate-x-[-2px] transition">
                <ChevronLeft className="h-5 w-5" />
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <main className="px-5 -mt-8 space-y-5">
        {/* Live order */}
        {activeOrder && (
          <LiveOrderCard order={activeOrder} />
        )}

        {/* Quick actions grid */}
        <section className="grid grid-cols-2 gap-3">
          <QuickCard
            to="/customer/wallet"
            label="المحفظة"
            sub="رصيدك وتعبئته"
            icon={Wallet}
            gradient="from-emerald-400 to-teal-600"
          />
          <QuickCard
            to="/customer/addresses"
            label="عناويني"
            sub="إدارة المواقع"
            icon={MapPin}
            gradient="from-rose-400 to-pink-600"
          />
          <QuickCard
            to="/customer/reports"
            label="تقاريري"
            sub="ملخص نشاطك"
            icon={BarChart3}
            gradient="from-amber-400 to-orange-600"
          />
          <QuickCard
            to="/customer/settings"
            label="الإعدادات"
            sub="بياناتك وتفضيلاتك"
            icon={Settings}
            gradient="from-slate-500 to-slate-700"
          />
        </section>

        {/* Orders list */}
        <section className="rounded-3xl bg-card shadow-[var(--shadow-soft)] p-5 border border-border/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-lg flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Droplets className="h-4 w-4 text-primary" />
              </span>
              {activeOrder ? "طلباتي السابقة" : "طلباتي"}
            </h2>
            {pastOrders.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {pastOrders.length.toLocaleString("ar-EG")} طلب
              </span>
            )}
          </div>

          {loading ? (
            <SkeletonList />
          ) : pastOrders.length === 0 && !activeOrder ? (
            <EmptyOrders />
          ) : pastOrders.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">
              تابع طلبك الحالي بالأعلى ✨
            </p>
          ) : (
            <ul className="space-y-2.5">
              {pastOrders.map((o) => {
                const s = STATUS_LABEL[o.status] || STATUS_LABEL.pending;
                const Icon = s.icon;
                return (
                  <li key={o.id}>
                    <Link
                      to="/customer/orders/$id"
                      params={{ id: o.id }}
                      className="flex items-center gap-3 rounded-2xl border border-border/70 p-3 hover:bg-muted/50 active:scale-[0.99] transition"
                    >
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${s.ring} flex items-center justify-center text-white shadow-sm shrink-0`}>
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">
                          وايت {o.capacity.toLocaleString("ar-EG")} لتر
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {o.city}
                        </p>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="font-extrabold text-sm">{o.price.toLocaleString("ar-EG")} <span className="text-[10px] font-medium text-muted-foreground">ر.ي</span></p>
                        <span className={`inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.chip}`}>
                          <Icon className="h-2.5 w-2.5" /> {s.text}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <CustomerBottomNav />
    </div>
  );
}

/* ============================================================ */

function QuickCard({
  to, label, sub, icon: Icon, gradient,
}: { to: any; label: string; sub: string; icon: any; gradient: string }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)] border border-border/60 active:scale-[0.97] transition"
    >
      <div className={`absolute -top-8 -left-6 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-15 blur-2xl group-hover:opacity-25 transition`} />
      <div className={`relative h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="relative mt-3 font-bold text-sm">{label}</p>
      <p className="relative text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </Link>
  );
}

function LiveOrderCard({ order }: { order: Order }) {
  const s = STATUS_LABEL[order.status] || STATUS_LABEL.pending;
  const Icon = s.icon;
  return (
    <Link
      to="/customer/orders/$id"
      params={{ id: order.id }}
      className="block animate-slide-up"
    >
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/60 shadow-[var(--shadow-soft)] p-5 active:scale-[0.99] transition">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.ring}`} />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`relative h-12 w-12 rounded-2xl bg-gradient-to-br ${s.ring} text-white flex items-center justify-center shrink-0 shadow-md`}>
              <Icon className="h-6 w-6" />
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">طلب نشط</p>
              <p className="font-display font-extrabold text-base truncate">{s.text}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {order.city} · {order.capacity.toLocaleString("ar-EG")} لتر
              </p>
            </div>
          </div>
          <div className="text-left shrink-0">
            <p className="font-extrabold">{order.price.toLocaleString("ar-EG")} <span className="text-[10px] text-muted-foreground">ر.ي</span></p>
            <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-primary text-primary-foreground px-2 py-1 text-[10px] font-bold">
              <Navigation className="h-3 w-3" /> تتبع
            </span>
          </div>
        </div>

        {/* progress */}
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${s.ring} transition-all duration-700`}
              style={{ width: `${s.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
            <span>تم الاستلام</span>
            <span>قيد التنفيذ</span>
            <span>تم التسليم</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyOrders() {
  return (
    <div className="py-8 text-center">
      <div className="relative mx-auto h-24 w-24">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-100 to-sky-200" />
        <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center shadow-inner">
          <Droplets className="h-10 w-10 text-primary" />
        </div>
        <span className="absolute inset-0 rounded-full ring-2 ring-cyan-300/50 animate-ripple" />
      </div>
      <p className="mt-4 font-display font-bold text-base">لم تطلب وايت بعد</p>
      <p className="mt-1 text-xs text-muted-foreground px-6">
        ابدأ بطلبك الأول واحصل على ماء عذب يصلك إلى باب منزلك.
      </p>
      <Link
        to="/customer/order"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-cyan-500 to-blue-700 text-white text-sm font-bold px-5 py-2.5 shadow-md active:scale-95 transition"
      >
        <Plus className="h-4 w-4" /> اطلب أول وايت
      </Link>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
          <div className="h-11 w-11 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
            <div className="h-2.5 w-1/3 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-6 w-14 rounded-full bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}
