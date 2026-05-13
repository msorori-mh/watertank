import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverShell, useDriverGate, DriverLoading } from "@/components/DriverShell";
import { CheckCircle2, Clock, Truck, Wallet, Star, MapPin, Phone, Loader2 } from "lucide-react";

export const Route = createFileRoute("/driver/")({
  component: DriverHome,
});

const ACTIVE_STATUSES = ["assigned", "on_the_way", "arrived", "delivering"] as const;
type OrderStatus = "pending" | "approved" | "assigned" | "on_the_way" | "arrived" | "delivering" | "completed" | "cancelled";

const NEXT_STATUS: Record<string, { next: OrderStatus; label: string }> = {
  assigned: { next: "on_the_way", label: "بدأت التحرك" },
  on_the_way: { next: "arrived", label: "وصلت للموقع" },
  arrived: { next: "delivering", label: "بدأت الصب" },
  delivering: { next: "completed", label: "تم التسليم" },
};

function DriverHome() {
  const nav = useNavigate();
  const gate = useDriverGate();
  const [active, setActive] = useState<any>(null);
  const [stats, setStats] = useState({ today: 0, earnings: 0 });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (gate.loading) return;
    if (!gate.driver) { nav({ to: "/driver/register" }); return; }
    const driver = gate.driver;
    (async () => {
      const todayIso = new Date(); todayIso.setHours(0, 0, 0, 0);
      const [{ data: act }, { data: my }] = await Promise.all([
        supabase.from("orders").select("*").eq("driver_id", driver.id).in("status", ACTIVE_STATUSES as any).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("orders").select("price,status,created_at").eq("driver_id", driver.id).eq("status", "completed").gte("created_at", todayIso.toISOString()),
      ]);
      setActive(act);
      setStats({ today: my?.length || 0, earnings: (my || []).reduce((a, o) => a + Number(o.price), 0) });
    })();
  }, [gate, nav]);

  if (gate.loading) return <DriverLoading />;
  if (!gate.driver) return <DriverLoading />;
  const driver = gate.driver;

  const setAvail = async (availability: "available" | "busy" | "offline") => {
    await supabase.from("drivers").update({ availability }).eq("id", driver.id);
    location.reload();
  };

  const advance = async () => {
    if (!active) return;
    const next = NEXT_STATUS[active.status]?.next;
    if (!next) return;
    setUpdating(true);
    await supabase.from("orders").update({ status: next }).eq("id", active.id);
    setUpdating(false);
    location.reload();
  };

  if (driver.license_status !== "approved") {
    return (
      <DriverShell title="حالة حسابك" driver={driver}>
        <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-6 mt-4 text-center">
          <Clock className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="font-display font-bold text-xl mt-4">
            {driver.license_status === "pending" ? "بانتظار موافقة المدير" : "تم رفض طلبك"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {driver.license_status === "pending"
              ? "سيتم إشعارك حال الموافقة على طلبك. يمكنك إغلاق التطبيق الآن."
              : "تواصل مع إدارة المنصة لمزيد من التفاصيل."}
          </p>
        </div>
      </DriverShell>
    );
  }

  return (
    <DriverShell title="مرحباً بك" driver={driver}>
      {/* Availability */}
      <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-4 mt-4">
        <p className="text-xs text-muted-foreground mb-2">حالة التوفر</p>
        <div className="grid grid-cols-3 gap-2">
          {(["available", "busy", "offline"] as const).map(a => {
            const labels = { available: "متاح", busy: "مشغول", offline: "غير متصل" };
            const sel = driver.availability === a;
            return (
              <button key={a} onClick={() => setAvail(a)}
                className={`rounded-xl py-2.5 text-sm font-semibold border-2 ${sel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white"}`}>
                {labels[a]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-3 text-center">
          <Truck className="h-4 w-4 mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-1">طلبات اليوم</p>
          <p className="font-display font-bold text-xl">{stats.today}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-3 text-center">
          <Wallet className="h-4 w-4 mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-1">أرباح اليوم</p>
          <p className="font-display font-bold text-sm">{stats.earnings.toLocaleString("ar-EG")} ر.ي</p>
        </div>
        <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-3 text-center">
          <Star className="h-4 w-4 mx-auto text-amber-500" />
          <p className="text-xs text-muted-foreground mt-1">التقييم</p>
          <p className="font-display font-bold text-xl">{Number(driver.rating).toFixed(1)}</p>
        </div>
      </div>

      {/* Active order */}
      <div className="mt-5">
        <h2 className="font-display font-bold text-lg mb-2">الطلب النشط</h2>
        {!active ? (
          <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">لا يوجد طلب نشط حالياً</p>
            <p className="text-xs text-muted-foreground">تحقق من الطلبات المتاحة في الأسفل ⬇</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display font-bold">وايت {active.capacity.toLocaleString("ar-EG")} لتر</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {active.city}
                </p>
                {active.address_snapshot && (
                  <p className="text-xs text-muted-foreground mt-1">{(active.address_snapshot as any).title} — {(active.address_snapshot as any).description || ""}</p>
                )}
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-lg">{Number(active.price).toLocaleString("ar-EG")}</p>
                <p className="text-xs text-muted-foreground">ر.ي • نقداً</p>
              </div>
            </div>
            <div className="rounded-lg bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
              الحالة: {active.status}
            </div>
            {active.address_snapshot && (
              <a href={`https://www.openstreetmap.org/?mlat=${(active.address_snapshot as any).lat}&mlon=${(active.address_snapshot as any).lng}&zoom=16`}
                target="_blank" rel="noreferrer"
                className="block text-center rounded-xl border-2 border-primary/30 py-2 text-sm font-semibold text-primary">
                <MapPin className="h-4 w-4 inline" /> فتح الموقع على الخريطة
              </a>
            )}
            {NEXT_STATUS[active.status] && (
              <button onClick={advance} disabled={updating}
                className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60 flex items-center justify-center gap-2">
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                {NEXT_STATUS[active.status].label} ←
              </button>
            )}
          </div>
        )}
      </div>
    </DriverShell>
  );
}
