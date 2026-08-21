import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverShell, useDriverGate, DriverLoading } from "@/components/DriverShell";
import { deferredFeatureGuard } from "@/lib/route-guards";
import { Loader2, Wallet, Clock, CheckCircle2, XCircle, Banknote, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/driver/earnings")({
  // MVP-02-CASH-ONLY-SCOPE: deferred feature, redirect before any query runs.
  beforeLoad: deferredFeatureGuard("/driver"),
  component: DriverEarnings,
});

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد بانتظار الدفع",
  rejected: "مرفوض",
  paid: "مدفوع",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-rose-100 text-rose-700",
  paid: "bg-emerald-100 text-emerald-700",
};

function DriverEarnings() {
  const gate = useDriverGate();
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const driverId = gate.loading ? null : gate.driver?.id || null;

  const load = async () => {
    if (!driverId) return;
    const [{ data: o }, { data: r }] = await Promise.all([
      supabase.from("orders")
        .select("id,price,app_commission,driver_payout_amount,driver_payout_status,city,wallet_paid_at,payment_method,status,created_at")
        .eq("driver_id", driverId)
        .eq("payment_method", "wallet")
        .order("created_at", { ascending: false }).limit(200),
      supabase.from("driver_withdrawal_requests")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false }).limit(50),
    ]);
    setOrders(o || []);
    setRequests(r || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!driverId) return;
    load();
    const ch = supabase.channel(`driver-earnings-${driverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_withdrawal_requests", filter: `driver_id=eq.${driverId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `driver_id=eq.${driverId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  if (gate.loading) return <DriverLoading />;
  if (!gate.driver) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">سجّل دخولك كسائق</div>;

  const availableOrders = orders.filter(o => o.driver_payout_status === "available");
  const availableTotal = availableOrders.reduce((a, o) => a + Number(o.driver_payout_amount || 0), 0);
  const paidTotal = orders.filter(o => o.driver_payout_status === "paid").reduce((a, o) => a + Number(o.driver_payout_amount || 0), 0);
  const pendingRequest = requests.find(r => r.status === "pending" || r.status === "approved");

  const submit = async () => {
    setSubmitting(true);
    const { error } = await supabase.rpc("request_driver_withdrawal", { _payment_method_notes: notes || undefined });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إرسال طلب السحب");
    setNotes(""); setShowForm(false); load();
  };

  return (
    <DriverShell title="مستحقاتي" driver={gate.driver}>
      <Link to="/driver" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowRight className="h-4 w-4" /> رجوع
      </Link>

      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 text-sm opacity-90"><Wallet className="h-4 w-4" /> المتاح للسحب</div>
        <p className="font-display text-3xl font-bold mt-2">{availableTotal.toLocaleString("ar-EG")} <span className="text-base">ر.ي</span></p>
        <p className="text-xs opacity-80 mt-1">{availableOrders.length} طلب جاهز</p>

        {pendingRequest ? (
          <div className="mt-4 rounded-xl bg-white/15 p-3 text-sm">
            لديك طلب سحب نشط بمبلغ {Number(pendingRequest.amount).toLocaleString("ar-EG")} ر.ي ({STATUS_LABELS[pendingRequest.status]})
          </div>
        ) : (
          <button
            disabled={availableTotal <= 0}
            onClick={() => setShowForm(true)}
            className="mt-4 w-full rounded-xl bg-white text-emerald-700 font-bold py-2.5 disabled:opacity-50"
          >
            طلب سحب كامل المستحقات
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
          <p className="text-xs text-muted-foreground">إجمالي مدفوع</p>
          <p className="font-bold">{paidTotal.toLocaleString("ar-EG")} ر.ي</p>
        </div>
        <div className="rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
          <p className="text-xs text-muted-foreground">طلبات السحب</p>
          <p className="font-bold">{requests.length}</p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg mb-2">طلب سحب</h3>
            <p className="text-sm text-muted-foreground mb-3">سيتم طلب سحب {availableTotal.toLocaleString("ar-EG")} ر.ي (كامل المتاح).</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ملاحظات (مثال: رقم محفظة الكريمي / رقم الحساب)"
              className="w-full rounded-xl border border-border p-3 text-sm h-24"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-border py-2.5 font-semibold">إلغاء</button>
              <button onClick={submit} disabled={submitting} className="flex-1 rounded-xl bg-emerald-600 text-white py-2.5 font-bold disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "تأكيد الطلب"}
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 className="font-display font-bold mt-6 mb-2">سجل طلبات السحب</h3>
      <div className="space-y-2">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> :
          requests.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد طلبات سحب بعد</p> :
          requests.map(r => (
            <div key={r.id} className="rounded-xl bg-card p-3 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <p className="font-bold">{Number(r.amount).toLocaleString("ar-EG")} ر.ي</p>
                <span className={`text-xs rounded-full px-2 py-0.5 ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("ar-EG")}</p>
              {r.payment_method_notes && <p className="text-xs mt-1">{r.payment_method_notes}</p>}
              {r.admin_notes && <p className="text-xs text-rose-600 mt-1">ملاحظة الإدارة: {r.admin_notes}</p>}
            </div>
          ))
        }
      </div>

      <h3 className="font-display font-bold mt-6 mb-2">طلبات المحفظة المتاحة</h3>
      <div className="space-y-2 mb-6">
        {availableOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد طلبات متاحة حالياً</p>
        ) : availableOrders.map(o => (
          <div key={o.id} className="rounded-xl bg-card p-3 shadow-[var(--shadow-soft)] text-sm">
            <div className="flex justify-between">
              <span className="font-mono text-xs">#{o.id.slice(0,8).toUpperCase()}</span>
              <span className="font-bold text-emerald-700">+{Number(o.driver_payout_amount).toLocaleString("ar-EG")} ر.ي</span>
            </div>
            <p className="text-xs text-muted-foreground">{o.city} • سعر {Number(o.price).toLocaleString("ar-EG")} • عمولة {Number(o.app_commission).toLocaleString("ar-EG")}</p>
          </div>
        ))}
      </div>
    </DriverShell>
  );
}
