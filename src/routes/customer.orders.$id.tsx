import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { customerRouteGuard } from "@/lib/route-guards";
import { ChevronRight, MapPin, Truck, CheckCircle2, Clock, X, Loader2, Phone } from "lucide-react";
import { notifyUser, ORDER_EVENT_MESSAGES, shortId } from "@/lib/notifications";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";

export const Route = createFileRoute("/customer/orders/$id")({
  ...customerRouteGuard,
  component: OrderDetail,
});

const STEPS = [
  { id: "pending", label: "بانتظار الاعتماد" },
  { id: "approved", label: "اعتُمد الطلب" },
  { id: "assigned", label: "تعيين سائق" },
  { id: "accepted", label: "قبله السائق" },
  { id: "on_the_way", label: "في الطريق" },
  { id: "arrived", label: "وصل الموقع" },
  { id: "delivering", label: "يصب الماء" },
  { id: "payment_collected", label: "تم الدفع" },
  { id: "completed", label: "اكتمل" },
];

function OrderDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    setOrder(data);
    if (data?.driver_id) {
      const { data: d } = await supabase.from("drivers").select("*").eq("id", data.driver_id).maybeSingle();
      setDriver(d);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const cancel = async () => {
    if (!confirm("هل تريد إلغاء الطلب؟")) return;
    setCancelling(true);
    const { error } = await supabase.rpc("cancel_customer_order", { _order_id: id });
    if (error) {
      alert(error.message);
      setCancelling(false);
      return;
    }
    const msg = ORDER_EVENT_MESSAGES.order_cancelled!;
    if (order?.customer_id) {
      await notifyUser(order.customer_id, id, "order_cancelled", msg.title, msg.body(shortId(id)));
    }
    if (driver?.user_id) {
      await notifyUser(driver.user_id, id, "order_cancelled", msg.title, msg.body(shortId(id)));
    }
    setCancelling(false);
    load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" />
      <CustomerBottomNav />
    </div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">الطلب غير موجود</div>;

  const stepIdx = STEPS.findIndex(s => s.id === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="px-5 py-4 flex items-center gap-3 bg-card border-b border-border">
        <Link to="/customer" className="rounded-full p-2 hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </Link>
        <h1 className="font-display font-bold text-lg">تفاصيل الطلب</h1>
      </header>

      <main className="px-5 py-6 space-y-5 max-w-md mx-auto">
        <div className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
          <p className="text-xs text-muted-foreground">رقم الطلب</p>
          <p className="font-mono text-sm font-bold">#{order.id.slice(0, 8).toUpperCase()}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">الحجم</p>
              <p className="font-bold">{order.capacity.toLocaleString("ar-EG")} لتر</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">السعر</p>
              <p className="font-bold">{Number(order.price).toLocaleString("ar-EG")} ر.ي</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المدينة</p>
              <p className="font-bold flex items-center gap-1"><MapPin className="h-3 w-3" />{order.city}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الدفع</p>
              <p className="font-bold">{order.payment_method === "wallet" ? "من المحفظة (مدفوع)" : "نقداً عند الاستلام"}</p>
            </div>
          </div>
          {order.address_snapshot && (
            <div className="mt-4 pt-4 border-t border-border text-sm">
              <p className="text-xs text-muted-foreground mb-1">عنوان التسليم</p>
              <p className="font-medium">{(order.address_snapshot as any).title}</p>
              {(order.address_snapshot as any).description && (
                <p className="text-xs text-muted-foreground">{(order.address_snapshot as any).description}</p>
              )}
            </div>
          )}
        </div>

        {/* Tracker */}
        {!isCancelled ? (
          <div className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
            <h3 className="font-display font-bold mb-4">حالة الطلب</h3>
            <ol className="space-y-3">
              {STEPS.map((s, i) => {
                const done = i <= stepIdx;
                const active = i === stepIdx;
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${active ? "ring-4 ring-primary/20" : ""}`}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <span className={`text-sm ${done ? "font-bold" : "text-muted-foreground"}`}>{s.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 text-rose-700 flex items-center gap-3">
            <X className="h-5 w-5" /> تم إلغاء هذا الطلب
          </div>
        )}

        {order.wallet_refunded_at && (
          <div className="rounded-2xl bg-purple-50 border border-purple-200 p-5 text-purple-800">
            <p className="font-bold mb-1">تم استرداد المبلغ إلى محفظتك</p>
            <p className="text-xs">المبلغ: {Number(order.price).toLocaleString("ar-EG")} ر.ي</p>
            <p className="text-xs">التاريخ: {new Date(order.wallet_refunded_at).toLocaleString("ar-EG")}</p>
            {order.refund_reason && <p className="text-xs mt-1">السبب: {order.refund_reason}</p>}
          </div>
        )}

        {driver && (
          <div className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
            <h3 className="font-display font-bold mb-3">السائق</h3>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold">{driver.name}</p>
                <p className="text-xs text-muted-foreground">{driver.vehicle_plate} • {driver.vehicle_capacity.toLocaleString("ar-EG")} لتر</p>
              </div>
              <a href={`tel:${driver.phone}`} className="rounded-full bg-primary p-3 text-primary-foreground">
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {order.status === "pending" && (
          <button
            onClick={cancel}
            disabled={cancelling}
            className="w-full rounded-xl border-2 border-destructive/30 text-destructive font-bold py-3 hover:bg-destructive/5"
          >
            {cancelling ? "جاري الإلغاء…" : "إلغاء الطلب"}
          </button>
        )}
      </main>
    </div>
  );
}
