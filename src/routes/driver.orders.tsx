import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { driverRouteGuard } from "@/lib/route-guards";
import { DriverShell, useDriverGate, DriverLoading } from "@/components/DriverShell";
import { MapPin, Loader2, Truck } from "lucide-react";
import { notifyUser, ORDER_EVENT_MESSAGES, shortId } from "@/lib/notifications";

export const Route = createFileRoute("/driver/orders")({
  ...driverRouteGuard,
  component: DriverAvailableOrders,
});

function DriverAvailableOrders() {
  const nav = useNavigate();
  const gate = useDriverGate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = async () => {
    // RLS already restricts to approved + same city + license_status approved
    const { data } = await supabase.from("orders").select("*")
      .eq("status", "approved")
      .is("driver_id", null)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (gate.loading) return;
    if (!gate.driver) { nav({ to: "/driver/register" }); return; }
    load();
    const ch = supabase.channel("driver-available-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [gate, nav]);

  if (gate.loading || !gate.driver) return <DriverLoading />;
  const driver = gate.driver;

  if (driver.license_status !== "approved") {
    return (
      <DriverShell title="الطلبات المتاحة" driver={driver}>
        <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-6 mt-4 text-center text-sm text-muted-foreground">
          سيتم عرض الطلبات بعد موافقة الإدارة على حسابك
        </div>
      </DriverShell>
    );
  }

  const accept = async (id: string) => {
    setAccepting(id);
    try {
      // منع تعدد الطلبات النشطة
      const { data: active } = await supabase.from("orders").select("id")
        .eq("driver_id", driver.id)
        .in("status", ["accepted","on_the_way","arrived","delivering","payment_collected"] as any)
        .limit(1).maybeSingle();
      if (active) {
        alert("يجب إنهاء الطلب الحالي أولاً");
        nav({ to: "/driver" });
        return;
      }
      const order = orders.find((o) => o.id === id);
      const { error } = await supabase.rpc("claim_approved_order", { _order_id: id });
      if (error) { alert("تعذر قبول الطلب: " + error.message); return; }
      if (order?.customer_id) {
        const msg = ORDER_EVENT_MESSAGES.order_accepted!;
        await notifyUser(order.customer_id, id, "order_accepted", msg.title, msg.body(shortId(id)));
      }
      nav({ to: "/driver" });
    } finally {
      setAccepting(null);
    }
  };

  return (
    <DriverShell title="الطلبات المتاحة" driver={driver}>
      <div className="space-y-3 mt-4">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-6 text-center">
            <Truck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">لا توجد طلبات معتمدة حالياً</p>
            <p className="text-xs text-muted-foreground mt-1">تظهر الطلبات هنا فور اعتماد الإدارة لها</p>
          </div>
        ) : orders.map(o => (
          <div key={o.id} className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display font-bold">وايت {o.capacity.toLocaleString("ar-EG")} لتر</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {o.city}</p>
                {o.address_snapshot && (
                  <p className="text-xs text-muted-foreground mt-1">{(o.address_snapshot as any).title}</p>
                )}
              </div>
              <div className="text-left">
                <p className="font-display font-bold">{Number(o.price).toLocaleString("ar-EG")}</p>
                <p className="text-xs text-muted-foreground">ر.ي{o.payment_method === "wallet" ? " • مدفوع مسبقاً" : " • تستلمها كاملة"}</p>
                {o.payment_method === "wallet" ? (
                  <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                    مستحقك: {Number(o.driver_payout_amount || Math.max(Number(o.price) - Number(o.app_commission || 0), 0)).toLocaleString("ar-EG")} ر.ي
                  </p>
                ) : Number(o.app_commission || 0) > 0 && (
                  <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                    عمولة: {Number(o.app_commission).toLocaleString("ar-EG")} ر.ي
                  </p>
                )}
              </div>
            </div>
            {o.payment_method === "wallet" ? (
              <div className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5 mt-2 leading-5 space-y-0.5">
                <p className="font-semibold">مدفوع من محفظة العميل — لا تحصّل أي مبلغ نقدي.</p>
                <p>قيمة الطلب: {Number(o.price).toLocaleString("ar-EG")} • عمولة التطبيق: {Number(o.app_commission || 0).toLocaleString("ar-EG")} • مستحقك بعد العمولة: {Number(o.driver_payout_amount || Math.max(Number(o.price) - Number(o.app_commission || 0), 0)).toLocaleString("ar-EG")} ر.ي</p>
              </div>
            ) : (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mt-2 leading-5">
                قيمة الطلب يستلمها السائق نقداً من العميل، وعمولة التطبيق تُسجَّل كمستحق لاحق للإدارة.
              </p>
            )}
            {o.address_snapshot && (
              <a href={`https://www.google.com/maps?q=${(o.address_snapshot as any).lat},${(o.address_snapshot as any).lng}`}
                target="_blank" rel="noreferrer"
                className="block text-center mt-2 rounded-xl border border-primary/30 py-2 text-xs font-semibold text-primary">
                <MapPin className="h-3 w-3 inline" /> الموقع على الخريطة
              </a>
            )}
            <button onClick={() => accept(o.id)} disabled={accepting === o.id}
              className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2">
              {accepting === o.id && <Loader2 className="h-4 w-4 animate-spin" />}
              قبول الطلب
            </button>
          </div>
        ))}
      </div>
    </DriverShell>
  );
}
