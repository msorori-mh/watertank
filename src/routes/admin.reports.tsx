import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { adminRouteGuard } from "@/lib/route-guards";
import { Loader2, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/admin/reports")({
  ...adminRouteGuard,
  component: AdminReports,
});

function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [pm, setPm] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("orders").select("id,city,status,price,app_commission,commission_status,driver_id,driver_payout_amount,driver_payout_status,payment_method,created_at,customer_id");
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to + "T23:59:59");
      if (city) q = q.eq("city", city);
      if (driverId) q = q.eq("driver_id", driverId);
      if (pm) q = q.eq("payment_method", pm as any);
      if (status) q = q.eq("status", status as any);

      const [{ data: ords }, { data: drv }, { data: tp }, { data: wd }, { data: cts }] = await Promise.all([
        q.order("created_at", { ascending: false }).limit(2000),
        supabase.from("drivers").select("id,name,city"),
        supabase.from("wallet_topups").select("id,amount,status,created_at,user_id"),
        supabase.from("driver_withdrawal_requests").select("id,amount,status,created_at,driver_id"),
        supabase.from("cities").select("name").eq("is_active", true),
      ]);
      setOrders(ords || []);
      setDrivers(drv || []);
      setTopups(tp || []);
      setWithdrawals(wd || []);
      setCities(cts || []);
      setLoading(false);
    })();
  }, [from, to, city, driverId, pm, status]);

  const driverName = (id: string | null) => drivers.find(d => d.id === id)?.name || "—";

  const stats = useMemo(() => {
    const completed = orders.filter(o => o.status === "completed");
    const cancelled = orders.filter(o => o.status === "cancelled");
    const rejected = orders.filter(o => o.status === "rejected");
    const totalValue = orders.reduce((a, o) => a + Number(o.price), 0);
    const completedValue = completed.reduce((a, o) => a + Number(o.price), 0);
    const totalCommission = orders.reduce((a, o) => a + Number(o.app_commission || 0), 0);
    const cashUnpaid = orders.filter(o => o.payment_method === "cash" && o.commission_status === "unpaid").reduce((a, o) => a + Number(o.app_commission || 0), 0);
    const walletCollected = orders.filter(o => o.payment_method === "wallet" && o.commission_status === "collected").reduce((a, o) => a + Number(o.app_commission || 0), 0);
    const walletPayoutPending = orders.filter(o => o.payment_method === "wallet" && (o.driver_payout_status === "available" || o.driver_payout_status === "pending")).reduce((a, o) => a + Number(o.driver_payout_amount || 0), 0);
    const withdrawalsPaid = withdrawals.filter(w => w.status === "paid").reduce((a, w) => a + Number(w.amount), 0);
    return { total: orders.length, completed: completed.length, cancelled: cancelled.length, rejected: rejected.length, totalValue, completedValue, totalCommission, cashUnpaid, walletCollected, walletPayoutPending, withdrawalsPaid };
  }, [orders, withdrawals]);

  const byCity = useMemo(() => {
    const m: Record<string, { count: number; revenue: number; commission: number }> = {};
    orders.forEach(o => {
      const r = m[o.city] || (m[o.city] = { count: 0, revenue: 0, commission: 0 });
      r.count++;
      if (o.status === "completed") r.revenue += Number(o.price);
      r.commission += Number(o.app_commission || 0);
    });
    return Object.entries(m).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [orders]);

  const byDriver = useMemo(() => {
    const m: Record<string, { name: string; count: number; revenue: number; commission: number; unpaid: number }> = {};
    drivers.forEach(d => { m[d.id] = { name: d.name, count: 0, revenue: 0, commission: 0, unpaid: 0 }; });
    orders.forEach(o => {
      if (!o.driver_id) return;
      const r = m[o.driver_id]; if (!r) return;
      r.count++;
      if (o.status === "completed") r.revenue += Number(o.price);
      r.commission += Number(o.app_commission || 0);
      if (o.commission_status === "unpaid") r.unpaid += Number(o.app_commission || 0);
    });
    return Object.values(m).filter(r => r.count > 0).sort((a, b) => b.revenue - a.revenue);
  }, [orders, drivers]);

  const topupStats = useMemo(() => {
    const approved = topups.filter(t => t.status === "approved");
    const pending = topups.filter(t => t.status === "pending");
    const rejectedT = topups.filter(t => t.status === "rejected");
    return {
      approved: approved.length, approvedSum: approved.reduce((a, t) => a + Number(t.amount), 0),
      pending: pending.length, pendingSum: pending.reduce((a, t) => a + Number(t.amount), 0),
      rejected: rejectedT.length,
    };
  }, [topups]);

  if (loading) return <AdminShell title="التقارير"><div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div></AdminShell>;

  return (
    <AdminShell title="التقارير">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-4 mb-4 grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border border-border p-2" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border border-border p-2" />
        <select value={city} onChange={e => setCity(e.target.value)} className="rounded-lg border border-border p-2">
          <option value="">كل المدن</option>
          {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select value={driverId} onChange={e => setDriverId(e.target.value)} className="rounded-lg border border-border p-2">
          <option value="">كل السائقين</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={pm} onChange={e => setPm(e.target.value)} className="rounded-lg border border-border p-2">
          <option value="">كل طرق الدفع</option>
          <option value="cash">نقدي</option>
          <option value="wallet">محفظة</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-border p-2">
          <option value="">كل الحالات</option>
          {["pending","approved","accepted","on_the_way","arrived","delivering","payment_collected","completed","cancelled","rejected"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        <Kpi label="إجمالي الطلبات" value={stats.total} />
        <Kpi label="مكتملة" value={stats.completed} color="text-emerald-700" />
        <Kpi label="ملغية" value={stats.cancelled} color="text-rose-600" />
        <Kpi label="مرفوضة" value={stats.rejected} color="text-rose-600" />
        <Kpi label="إجمالي قيمة الطلبات" value={`${stats.totalValue.toLocaleString("ar-EG")} ر.ي`} />
        <Kpi label="إيرادات المكتملة" value={`${stats.completedValue.toLocaleString("ar-EG")} ر.ي`} color="text-emerald-700" />
        <Kpi label="إجمالي عمولات التطبيق" value={`${stats.totalCommission.toLocaleString("ar-EG")} ر.ي`} />
        <Kpi label="عمولات نقدية غير مسددة" value={`${stats.cashUnpaid.toLocaleString("ar-EG")} ر.ي`} color="text-rose-600" />
        <Kpi label="عمولات محفظة محصلة" value={`${stats.walletCollected.toLocaleString("ar-EG")} ر.ي`} color="text-emerald-700" />
        <Kpi label="مستحقات سائقين (محفظة)" value={`${stats.walletPayoutPending.toLocaleString("ar-EG")} ر.ي`} />
        <Kpi label="سحوبات مدفوعة" value={`${stats.withdrawalsPaid.toLocaleString("ar-EG")} ر.ي`} />
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <ExportBtn label="تصدير الطلبات" onClick={() => downloadCSV("orders.csv", orders.map(o => ({
          id: o.id, created_at: o.created_at, city: o.city, status: o.status, payment_method: o.payment_method,
          price: o.price, app_commission: o.app_commission, commission_status: o.commission_status,
          driver: driverName(o.driver_id), driver_payout_amount: o.driver_payout_amount, driver_payout_status: o.driver_payout_status,
        })))} />
        <ExportBtn label="تصدير العمولات" onClick={() => downloadCSV("commissions.csv", orders.filter(o => Number(o.app_commission || 0) > 0).map(o => ({
          order_id: o.id, created_at: o.created_at, city: o.city, driver: driverName(o.driver_id),
          payment_method: o.payment_method, price: o.price, app_commission: o.app_commission, commission_status: o.commission_status,
        })))} />
        <ExportBtn label="تصدير السحوبات" onClick={() => downloadCSV("withdrawals.csv", withdrawals.map(w => ({
          id: w.id, created_at: w.created_at, driver: driverName(w.driver_id), amount: w.amount, status: w.status,
        })))} />
        <ExportBtn label="تصدير تعبئات المحفظة" onClick={() => downloadCSV("wallet-topups.csv", topups.map(t => ({
          id: t.id, created_at: t.created_at, user_id: t.user_id, amount: t.amount, status: t.status,
        })))} />
      </div>

      {/* Tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="الطلبات حسب المدينة">
          <Table headers={["المدينة","الطلبات","الإيرادات","العمولة"]} rows={byCity.map(([c, v]) => [c, v.count, `${v.revenue.toLocaleString("ar-EG")} ر.ي`, `${v.commission.toLocaleString("ar-EG")} ر.ي`])} />
        </Card>
        <Card title="أداء السائقين">
          <Table headers={["السائق","طلبات","إيرادات","عمولة","غير مسدد"]} rows={byDriver.map(d => [d.name, d.count, `${d.revenue.toLocaleString("ar-EG")}`, `${d.commission.toLocaleString("ar-EG")}`, `${d.unpaid.toLocaleString("ar-EG")}`])} />
        </Card>
        <Card title="المحفظة والتعبئات">
          <div className="p-4 text-sm space-y-2">
            <Row label="تعبئات معتمدة" value={`${topupStats.approved} (${topupStats.approvedSum.toLocaleString("ar-EG")} ر.ي)`} />
            <Row label="تعبئات معلقة" value={`${topupStats.pending} (${topupStats.pendingSum.toLocaleString("ar-EG")} ر.ي)`} />
            <Row label="تعبئات مرفوضة" value={`${topupStats.rejected}`} />
          </div>
        </Card>
        <Card title="السحوبات">
          <Table headers={["التاريخ","السائق","المبلغ","الحالة"]} rows={withdrawals.slice(0, 30).map(w => [
            new Date(w.created_at).toLocaleDateString("ar-EG"), driverName(w.driver_id), `${Number(w.amount).toLocaleString("ar-EG")} ر.ي`, w.status,
          ])} />
        </Card>
      </div>
    </AdminShell>
  );
}

function Kpi({ label, value, color = "" }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display font-bold text-lg mt-1 ${color}`}>{value}</p>
    </div>
  );
}
function Card({ title, children }: any) {
  return <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden"><div className="p-4 border-b border-border"><h2 className="font-display font-bold">{title}</h2></div>{children}</div>;
}
function Table({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs text-muted-foreground"><tr>{headers.map(h => <th key={h} className="text-right p-3">{h}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 ? <tr><td colSpan={headers.length} className="p-6 text-center text-muted-foreground text-sm">لا توجد بيانات</td></tr> :
          rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="p-3">{c}</td>)}</tr>)}
      </tbody>
    </table>
  );
}
function Row({ label, value }: any) { return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-bold">{value}</span></div>; }
function ExportBtn({ label, onClick }: any) {
  return <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"><Download className="h-4 w-4" /> {label}</button>;
}
