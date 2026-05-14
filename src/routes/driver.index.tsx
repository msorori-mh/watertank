import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverShell, useDriverGate, DriverLoading } from "@/components/DriverShell";
import { CheckCircle2, Clock, Truck, Wallet, Star, MapPin, Loader2, BadgeDollarSign } from "lucide-react";
import { notifyUser, ORDER_EVENT_MESSAGES, shortId, type NotificationType } from "@/lib/notifications";

const STEP_TO_NOTIF: Record<string, NotificationType | undefined> = {
  on_the_way: "order_on_way",
  arrived: "order_arrived",
  delivering: "order_unloading",
  payment_collected: "order_payment_collected",
  completed: "order_completed",
};

export const Route = createFileRoute("/driver/")({
  component: DriverHome,
});

const ACTIVE_STATUSES = ["assigned", "accepted", "on_the_way", "arrived", "delivering", "payment_collected"] as const;
type OrderStatus = "pending" | "approved" | "assigned" | "accepted" | "on_the_way" | "arrived" | "delivering" | "payment_collected" | "completed" | "cancelled" | "rejected";

const NEXT_STATUS: Record<string, { next: OrderStatus; label: string }> = {
  assigned: { next: "accepted", label: "بدء الطلب" },
  accepted: { next: "on_the_way", label: "بدأت التحرك" },
  on_the_way: { next: "arrived", label: "وصلت للموقع" },
  arrived: { next: "delivering", label: "بدأت الصب" },
  delivering: { next: "payment_collected", label: "تم استلام المبلغ" },
  payment_collected: { next: "completed", label: "إنهاء الطلب" },
};

const WALLET_LABEL_OVERRIDES: Record<string, string> = {
  delivering: "تم التسليم",
};

function DriverHome() {
  const nav = useNavigate();
  const gate = useDriverGate();
  const [active, setActive] = useState<any>(null);
  const [stats, setStats] = useState({ today: 0, earnings: 0 });
  const [updating, setUpdating] = useState(false);

  const load = async (driverId: string) => {
    const todayIso = new Date(); todayIso.setHours(0, 0, 0, 0);
    const [{ data: act }, { data: my }] = await Promise.all([
      supabase.from("orders").select("*").eq("driver_id", driverId).in("status", ACTIVE_STATUSES as any).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("orders").select("price,status,created_at").eq("driver_id", driverId).eq("status", "completed").gte("created_at", todayIso.toISOString()),
    ]);
    setActive(act);
    setStats({ today: my?.length || 0, earnings: (my || []).reduce((a, o) => a + Number(o.price), 0) });
  };

  useEffect(() => {
    if (gate.loading) return;
    if (!gate.driver) { nav({ to: "/driver/register" }); return; }
    const driver = gate.driver;
    load(driver.id);
    const ch = supabase.channel(`driver-active-${driver.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `driver_id=eq.${driver.id}` },
        () => load(driver.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
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
    const step = NEXT_STATUS[active.status];
    if (!step) return;
    setUpdating(true);

    try {
      if (step.next === "payment_collected") {
        // Atomic: validates state, marks paid, increments driver balance, logs history
        const { error } = await supabase.rpc("collect_order_payment", { _order_id: active.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("orders").update({ status: step.next }).eq("id", active.id);
        if (error) throw error;
      }

      // إشعار العميل بكل تقدم
      const t = STEP_TO_NOTIF[step.next];
      if (t && active.customer_id) {
        const msg = ORDER_EVENT_MESSAGES[t]!;
        await notifyUser(active.customer_id, active.id, t, msg.title, msg.body(shortId(active.id)));
      }
    } catch (e: any) {
      alert("تعذر تحديث الطلب: " + (e?.message || "خطأ غير متوقع"));
    } finally {
      setUpdating(false);
      load(driver.id);
    }
  };

  if (driver.license_status !== "approved") {
    return (
      <DriverShell title="حالة حسابك" driver={driver}>
        <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-6 mt-4 text-center">
          <Clock className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="font-display font-bold text-xl mt-4">
            {driver.license_status === "pending" ? "بانتظار موافقة الإدارة" : "تم رفض طلبك"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {driver.license_status === "pending"
              ? "سيتم إشعارك حال الموافقة على طلبك."
              : "تواصل مع إدارة المنصة لمزيد من التفاصيل."}
          </p>
        </div>
      </DriverShell>
    );
  }

  const isPaymentStep = active?.status === "delivering";
  const isFinalStep = active?.status === "payment_collected";

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
          <p className="text-xs text-muted-foreground mt-1">اليوم</p>
          <p className="font-display font-bold text-xl">{stats.today}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-3 text-center">
          <Wallet className="h-4 w-4 mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-1">عمولة مستحقة</p>
          <p className="font-display font-bold text-sm">{Number(driver.balance || 0).toLocaleString("ar-EG")} ر.ي</p>
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
            <p className="text-sm text-muted-foreground mt-3">لا يوجد طلب نشط</p>
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
                <p className="text-xs text-muted-foreground">ر.ي{active.payment_method === "wallet" ? " • مدفوع مسبقاً" : " • تستلمها كاملة"}</p>
                {active.payment_method === "wallet" ? (
                  <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                    مستحقك: {Number(active.driver_payout_amount || Math.max(Number(active.price) - Number(active.app_commission || 0), 0)).toLocaleString("ar-EG")} ر.ي
                  </p>
                ) : Number(active.app_commission || 0) > 0 && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                    عمولة التطبيق: {Number(active.app_commission).toLocaleString("ar-EG")} ر.ي
                  </p>
                )}
              </div>
            </div>
            {active.payment_method === "wallet" ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-900 leading-5 space-y-1">
                <div className="flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4" /> مدفوع من محفظة العميل — لا تحصّل أي مبلغ نقدي.</div>
                <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                  <div className="bg-white/60 rounded p-1"><div className="text-emerald-900/70">قيمة الطلب</div><div className="font-bold">{Number(active.price).toLocaleString("ar-EG")}</div></div>
                  <div className="bg-white/60 rounded p-1"><div className="text-emerald-900/70">عمولة التطبيق</div><div className="font-bold">{Number(active.app_commission || 0).toLocaleString("ar-EG")}</div></div>
                  <div className="bg-white/60 rounded p-1"><div className="text-emerald-900/70">مستحقك</div><div className="font-bold">{Number(active.driver_payout_amount || Math.max(Number(active.price) - Number(active.app_commission || 0), 0)).toLocaleString("ar-EG")}</div></div>
                </div>
                {active.driver_payout_status === "available" && <div className="text-[11px] font-semibold">المستحق متاح للسحب لاحقاً ✅</div>}
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 leading-5">
                قيمة الطلب يستلمها السائق نقداً من العميل، وعمولة التطبيق تُسجَّل كمستحق على السائق ويتم تسديدها لاحقاً للإدارة.
              </div>
            )}
            <div className="rounded-lg bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
              الحالة: {active.status}
            </div>
            {active.address_snapshot && (
              <a href={`https://www.google.com/maps?q=${(active.address_snapshot as any).lat},${(active.address_snapshot as any).lng}`}
                target="_blank" rel="noreferrer"
                className="block text-center rounded-xl border-2 border-primary/30 py-2 text-sm font-semibold text-primary">
                <MapPin className="h-4 w-4 inline" /> فتح في خرائط جوجل
              </a>
            )}
            {NEXT_STATUS[active.status] && (
              <button onClick={advance} disabled={updating}
                className={`w-full rounded-xl py-3 font-bold shadow-[var(--shadow-glow)] disabled:opacity-60 flex items-center justify-center gap-2 ${
                  isPaymentStep ? (active.payment_method === "wallet" ? "bg-primary text-primary-foreground" : "bg-emerald-600 text-white") : isFinalStep ? "bg-slate-900 text-white" : "bg-primary text-primary-foreground"
                }`}>
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPaymentStep && active.payment_method !== "wallet" && <BadgeDollarSign className="h-4 w-4" />}
                {(active.payment_method === "wallet" && WALLET_LABEL_OVERRIDES[active.status]) || NEXT_STATUS[active.status].label} ←
              </button>
            )}
          </div>
        )}
      </div>
    </DriverShell>
  );
}
