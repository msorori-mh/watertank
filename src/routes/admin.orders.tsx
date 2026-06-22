import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { notifyUser, ORDER_EVENT_MESSAGES, shortId, type NotificationType } from "@/lib/notifications";
import { adminRouteGuard } from "@/lib/route-guards";

const STATUS_TO_NOTIF: Record<string, NotificationType | undefined> = {
  approved: "order_approved",
  rejected: "order_rejected",
  on_the_way: "order_on_way",
  arrived: "order_arrived",
  delivering: "order_unloading",
  payment_collected: "order_payment_collected",
  completed: "order_completed",
  cancelled: "order_cancelled",
};

export const Route = createFileRoute("/admin/orders")({
  ...adminRouteGuard,
  component: AdminOrders,
});

const STATUSES = ["pending", "approved", "assigned", "accepted", "on_the_way", "arrived", "delivering", "payment_collected", "completed", "cancelled", "rejected"] as const;
type Status = typeof STATUSES[number];

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار الاعتماد", approved: "معتمد", assigned: "مُعيَّن",
  accepted: "قبله السائق", on_the_way: "في الطريق", arrived: "وصل",
  delivering: "يصب الماء", payment_collected: "تم التحصيل",
  completed: "مكتمل", cancelled: "ملغي", rejected: "مرفوض",
};

function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    const [{ data: o }, { data: d }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("drivers").select("id,name,city,license_status").eq("license_status", "approved"),
    ]);
    setOrders(o || []); setDrivers(d || []); setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const update = async (id: string, patch: any) => {
    setUpdating(id);
    const prev = orders.find((o) => o.id === id);
    await supabase.from("orders").update(patch).eq("id", id);

    // إشعارات تلقائية للعميل عند تغيّر الحالة
    if (prev && patch.status && patch.status !== prev.status) {
      const t = STATUS_TO_NOTIF[patch.status];
      if (t) {
        const msg = ORDER_EVENT_MESSAGES[t]!;
        await notifyUser(prev.customer_id, id, t, msg.title, msg.body(shortId(id)));
      }
    }
    // إشعار للسائق عند تعيينه لطلب
    if (prev && patch.driver_id && patch.driver_id !== prev.driver_id) {
      const { data: drv } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", patch.driver_id)
        .maybeSingle();
      if (drv?.user_id) {
        await notifyUser(
          drv.user_id,
          id,
          "general",
          "طلب جديد مُسند إليك",
          `تم تعيينك للطلب #${shortId(id)} في ${prev.city}.`,
        );
      }
    }
    setUpdating(null);
    load();
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  return (
    <AdminShell title="إدارة الطلبات">
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-white border border-border"}`}>
          الكل ({orders.length})
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "bg-white border border-border"}`}>
            {STATUS_LABELS[s]} ({orders.filter(o => o.status === s).length})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">الرقم</th>
                <th className="text-right p-3">المدينة</th>
                <th className="text-right p-3">الحجم</th>
                <th className="text-right p-3">السعر</th>
                <th className="text-right p-3">الدفع</th>
                <th className="text-right p-3">السائق</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const cityDrivers = drivers.filter(d => !d.city || d.city === o.city);
                return (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">#{o.id.slice(0,8).toUpperCase()}</td>
                    <td className="p-3">{o.city}</td>
                    <td className="p-3">{o.capacity.toLocaleString("ar-EG")} لتر</td>
                    <td className="p-3 font-semibold">{Number(o.price).toLocaleString("ar-EG")} ر.ي</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs rounded-full px-2 py-0.5 w-fit ${o.payment_method === "wallet" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                          {o.payment_method === "wallet" ? "محفظة" : "عند التسليم"}
                        </span>
                        <span className={`text-xs rounded-full px-2 py-0.5 w-fit ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : o.payment_status === "refunded" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>
                          {o.payment_status === "paid" ? "مدفوع" : o.payment_status === "refunded" ? "مسترد" : "غير مدفوع"}
                        </span>
                        {o.wallet_refunded_at && (
                          <span className="text-[10px] text-muted-foreground" title={o.refund_reason || ""}>
                            استُرد: {new Date(o.wallet_refunded_at).toLocaleDateString("ar-EG")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={o.driver_id || ""}
                        onChange={(e) => update(o.id, { driver_id: e.target.value || null, status: e.target.value ? "assigned" : o.status })}
                        className="rounded border border-border px-2 py-1 text-xs"
                        disabled={o.status === "pending" || o.status === "rejected" || o.status === "cancelled"}
                      >
                        <option value="">— غير مُعيَّن —</option>
                        {cityDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={o.status}
                        onChange={(e) => update(o.id, { status: e.target.value })}
                        className="rounded border border-border px-2 py-1 text-xs"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 items-center">
                        {o.status === "pending" && (
                          <>
                            <button onClick={() => update(o.id, { status: "approved" })}
                              className="rounded-lg bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-semibold hover:bg-emerald-200">
                              <CheckCircle2 className="h-3 w-3 inline" /> اعتماد
                            </button>
                            <button onClick={() => update(o.id, { status: "rejected" })}
                              className="rounded-lg bg-rose-100 text-rose-700 px-2 py-1 text-xs font-semibold hover:bg-rose-200">
                              <XCircle className="h-3 w-3 inline" /> رفض
                            </button>
                          </>
                        )}
                        {updating === o.id && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
