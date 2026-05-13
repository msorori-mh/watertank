import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/wayet-auth";
import { Plus, Truck, Clock, CheckCircle2, MapPin, LogOut, ChevronLeft, Droplets } from "lucide-react";
import { NotificationsCenter } from "@/components/NotificationsCenter";

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

const STATUS_LABEL: Record<string, { text: string; color: string; icon: any }> = {
  pending: { text: "قيد المراجعة", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { text: "تم القبول", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  assigned: { text: "تم تعيين سائق", color: "bg-blue-100 text-blue-700", icon: Truck },
  on_the_way: { text: "في الطريق", color: "bg-primary/15 text-primary", icon: Truck },
  arrived: { text: "وصل الموقع", color: "bg-primary/15 text-primary", icon: MapPin },
  delivering: { text: "بدأ الصب", color: "bg-primary/15 text-primary", icon: Droplets },
  completed: { text: "تم التسليم", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { text: "ملغى", color: "bg-rose-100 text-rose-700", icon: Clock },
};

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-6 pt-8 pb-12 rounded-b-3xl shadow-[var(--shadow-glow)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">أهلاً بك</p>
            <h1 className="font-display text-xl font-bold">{profile?.phone || profile?.email || "عميل"}</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && <NotificationsCenter userId={user.id} variant="dark" />}
            <button onClick={handleSignOut} className="rounded-full p-2 bg-white/15 hover:bg-white/25">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Link
          to="/customer/order"
          className="mt-6 flex items-center justify-between rounded-2xl bg-white/15 backdrop-blur p-4 hover:bg-white/25 transition"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold">طلب وايت ماء جديد</p>
              <p className="text-xs opacity-80">حدد الحجم، النوع والعنوان</p>
            </div>
          </div>
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </header>

      <main className="px-5 -mt-6">
        <div className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
          <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" /> طلباتي
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">جاري التحميل…</p>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center">
              <Truck className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">لا توجد طلبات بعد</p>
              <Link to="/customer/order" className="inline-block mt-3 text-sm font-semibold text-primary">
                اطلب أول وايت →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const s = STATUS_LABEL[o.status] || STATUS_LABEL.pending;
                const Icon = s.icon;
                return (
                  <Link
                    key={o.id}
                    to="/customer/orders/$id"
                    params={{ id: o.id }}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/40"
                  >
                    <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">
                        وايت {o.capacity.toLocaleString("ar-EG")} لتر
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {o.city}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">{o.price.toLocaleString("ar-EG")} ر.ي</p>
                      <span className={`inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>
                        <Icon className="h-2.5 w-2.5" /> {s.text}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
