import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DriverShell, useDriverGate, DriverLoading } from "@/components/DriverShell";
import { Loader2, ArrowRight, ClipboardList, CheckCircle2, Banknote, Wallet } from "lucide-react";

export const Route = createFileRoute("/driver/reports")({
  component: DriverReports,
});

function DriverReports() {
  const gate = useDriverGate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const driverId = gate.loading ? null : gate.driver?.id || null;

  useEffect(() => {
    if (!driverId) return;
    (async () => {
      setLoading(true);
      let q = supabase.from("orders")
        .select("id,price,app_commission,commission_status,driver_payout_amount,driver_payout_status,payment_method,status,created_at,city")
        .eq("driver_id", driverId);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to + "T23:59:59");
      const [{ data: orders }, { data: handovers }, { data: withdrawals }] = await Promise.all([
        q.order("created_at", { ascending: false }).limit(500),
        supabase.from("cash_handovers").select("amount,created_at,notes").eq("driver_id", driverId).order("created_at", { ascending: false }).limit(50),
        supabase.from("driver_withdrawal_requests").select("amount,status,created_at").eq("driver_id", driverId).order("created_at", { ascending: false }).limit(50),
      ]);
      setData({ orders: orders || [], handovers: handovers || [], withdrawals: withdrawals || [] });
      setLoading(false);
    })();
  }, [driverId, from, to]);

  if (gate.loading) return <DriverLoading />;
  if (!gate.driver) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">سجّل دخولك كسائق</div>;

  const orders: any[] = data?.orders || [];
  const completed = orders.filter(o => o.status === "completed" || o.status === "payment_collected");
  const cash = orders.filter(o => o.payment_method === "cash");
  const wallet = orders.filter(o => o.payment_method === "wallet");
  const cashCollected = cash.filter(o => o.status === "completed" || o.status === "payment_collected").reduce((a, o) => a + Number(o.price), 0);
  const commissionTotal = orders.reduce((a, o) => a + Number(o.app_commission || 0), 0);
  const commissionUnpaid = orders.filter(o => o.commission_status === "unpaid").reduce((a, o) => a + Number(o.app_commission || 0), 0);
  const handoverTotal = (data?.handovers || []).reduce((a: number, h: any) => a + Number(h.amount), 0);
  const walletAvailable = wallet.filter(o => o.driver_payout_status === "available").reduce((a, o) => a + Number(o.driver_payout_amount || 0), 0);
  const walletPaid = wallet.filter(o => o.driver_payout_status === "paid").reduce((a, o) => a + Number(o.driver_payout_amount || 0), 0);
  const wPending = (data?.withdrawals || []).filter((w: any) => w.status === "pending" || w.status === "approved");
  const wPaid = (data?.withdrawals || []).filter((w: any) => w.status === "paid");
  const wPendingTotal = wPending.reduce((a: number, w: any) => a + Number(w.amount), 0);
  const wPaidTotal = wPaid.reduce((a: number, w: any) => a + Number(w.amount), 0);

  // by date
  const byDate: Record<string, { count: number; revenue: number }> = {};
  completed.forEach(o => {
    const k = new Date(o.created_at).toISOString().slice(0, 10);
    const r = byDate[k] || (byDate[k] = { count: 0, revenue: 0 });
    r.count++; r.revenue += Number(o.price);
  });

  return (
    <DriverShell title="تقاريري" driver={gate.driver}>
      <Link to="/driver" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3"><ArrowRight className="h-4 w-4" /> رجوع</Link>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-xl border border-border p-2 text-sm" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-xl border border-border p-2 text-sm" />
      </div>

      {loading ? <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div> : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="إجمالي الطلبات" value={orders.length} />
            <Stat label="المكتملة" value={completed.length} />
            <Stat label="نقدية" value={cash.length} />
            <Stat label="محفظة" value={wallet.length} />
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)] mt-3 text-sm space-y-2">
            <h3 className="font-display font-bold mb-2 flex items-center gap-2"><Banknote className="h-4 w-4 text-amber-600" /> النقدي والعمولات</h3>
            <Row label="نقدية تم استلامها" value={`${cashCollected.toLocaleString("ar-EG")} ر.ي`} />
            <Row label="إجمالي عمولات التطبيق" value={`${commissionTotal.toLocaleString("ar-EG")} ر.ي`} />
            <Row label="عمولات سددتها للإدارة" value={`${handoverTotal.toLocaleString("ar-EG")} ر.ي`} />
            <Row label="المتبقي عليّ" value={`${commissionUnpaid.toLocaleString("ar-EG")} ر.ي`} highlight={commissionUnpaid > 0 ? "text-rose-600" : ""} />
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)] mt-3 text-sm space-y-2">
            <h3 className="font-display font-bold mb-2 flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-600" /> طلبات المحفظة والسحوبات</h3>
            <Row label="مستحقات متاحة للسحب" value={`${walletAvailable.toLocaleString("ar-EG")} ر.ي`} highlight="text-emerald-700" />
            <Row label="مستحقات مدفوعة" value={`${walletPaid.toLocaleString("ar-EG")} ر.ي`} />
            <Row label="سحوبات معلقة" value={`${wPendingTotal.toLocaleString("ar-EG")} ر.ي (${wPending.length})`} />
            <Row label="سحوبات مدفوعة" value={`${wPaidTotal.toLocaleString("ar-EG")} ر.ي (${wPaid.length})`} />
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)] mt-3">
            <h3 className="font-display font-bold mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4" /> الأداء حسب التاريخ</h3>
            {Object.keys(byDate).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p> :
              <div className="space-y-2">
                {Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm border-b border-border pb-2">
                    <span>{new Date(k).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" })}</span>
                    <span className="text-muted-foreground">{v.count} طلب</span>
                    <span className="font-bold">{v.revenue.toLocaleString("ar-EG")} ر.ي</span>
                  </div>
                ))}
              </div>
            }
          </div>
        </>
      )}
    </DriverShell>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-lg mt-1">{value}</p>
    </div>
  );
}
function Row({ label, value, highlight = "" }: any) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={`font-bold ${highlight}`}>{value}</span></div>;
}
