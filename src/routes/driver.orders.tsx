import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverShell, useDriverGate, DriverLoading } from "@/components/DriverShell";
import { MapPin, Loader2, Truck } from "lucide-react";

export const Route = createFileRoute("/driver/orders")({
  component: DriverAvailableOrders,
});

function DriverAvailableOrders() {
  const nav = useNavigate();
  const gate = useDriverGate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (gate.loading) return;
    if (!gate.driver) { nav({ to: "/driver/register" }); return; }
    (async () => {
      const { data } = await supabase.from("orders").select("*")
        .in("status", ["pending", "approved"])
        .is("driver_id", null)
        .order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, [gate, nav]);

  if (gate.loading || !gate.driver) return <DriverLoading />;
  const driver = gate.driver;

  if (driver.license_status !== "approved") {
    return (
      <DriverShell title="الطلبات المتاحة" driver={driver}>
        <div className="rounded-2xl bg-white shadow-[var(--shadow-soft)] p-6 mt-4 text-center text-sm text-muted-foreground">
          سيتم عرض الطلبات بعد الموافقة على حسابك
        </div>
      </DriverShell>
    );
  }

  const accept = async (id: string) => {
    setAccepting(id);
    await supabase.from("orders").update({ driver_id: driver.id, status: "assigned" }).eq("id", id);
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
            <p className="text-sm text-muted-foreground mt-3">لا توجد طلبات متاحة حالياً</p>
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
