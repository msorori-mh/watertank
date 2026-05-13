import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverShell, useDriverGate, DriverLoading } from "@/components/DriverShell";
import { MapPin, Loader2, Truck } from "lucide-react";
import { notifyUser, ORDER_EVENT_MESSAGES, shortId } from "@/lib/notifications";

export const Route = createFileRoute("/driver/orders")({
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
    const order = orders.find((o) => o.id === id);
    await supabase.from("orders").update({ driver_id: driver.id, status: "accepted" }).eq("id", id);
    if (order?.customer_id) {
      const msg = ORDER_EVENT_MESSAGES.order_accepted!;
      await notifyUser(order.customer_id, id, "order_accepted", msg.title, msg.body(shortId(id)));
    }
    setAccepting(null);
    nav({ to: "/driver" });
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
                <p className="text-xs text-muted-foreground">ر.ي • نقداً</p>
              </div>
            </div>
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
