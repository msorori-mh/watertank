import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: orders }, { data: drivers }] = await Promise.all([
        supabase.from("orders").select("id,city,status,price,app_commission,commission_status,driver_id,created_at").order("created_at", { ascending: false }).limit(1000),
        supabase.from("drivers").select("id,name"),
      ]);
      setData({ orders: orders || [], drivers: drivers || [] });
      setLoading(false);
    })();
  }, []);

  if (loading || !data) return <AdminShell title="التقارير"><div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div></AdminShell>;

  const orders = data.orders;
  const drivers: any[] = data.drivers;

  // Daily report (last 7 days)
  const days: Record<string, { count: number; revenue: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    days[key] = { count: 0, revenue: 0 };
  }
  orders.forEach((o: any) => {
    const k = new Date(o.created_at).toISOString().slice(0, 10);
    if (days[k]) {
      days[k].count++;
      if (o.status === "completed") days[k].revenue += Number(o.price);
    }
  });

  // City report
  const cities: Record<string, { count: number; revenue: number; cancelled: number }> = {};
  orders.forEach((o: any) => {
    const c = cities[o.city] || (cities[o.city] = { count: 0, revenue: 0, cancelled: 0 });
    c.count++;
    if (o.status === "completed") c.revenue += Number(o.price);
    if (o.status === "cancelled" || o.status === "rejected") c.cancelled++;
  });

  // Driver performance + commissions
  const drvStats: Record<string, { count: number; revenue: number; commission: number; unpaidCommission: number; name: string }> = {};
  drivers.forEach(d => { drvStats[d.id] = { count: 0, revenue: 0, commission: 0, unpaidCommission: 0, name: d.name }; });
  orders.forEach((o: any) => {
    if (!o.driver_id) return;
    const s = drvStats[o.driver_id]; if (!s) return;
    s.count++;
    if (o.status === "completed") s.revenue += Number(o.price);
    s.commission += Number(o.app_commission || 0);
    if (o.commission_status === "unpaid") s.unpaidCommission += Number(o.app_commission || 0);
  });

  const cancelled = orders.filter((o: any) => o.status === "cancelled" || o.status === "rejected");
  const totalRevenue = orders.filter((o: any) => o.status === "completed").reduce((a: number, o: any) => a + Number(o.price), 0);

  // Commission daily / per city
  const commissionDays: Record<string, number> = {};
  Object.keys(days).forEach(k => { commissionDays[k] = 0; });
  const commissionCities: Record<string, { total: number; unpaid: number }> = {};
  let zeroCommissionCount = 0;
  orders.forEach((o: any) => {
    const c = Number(o.app_commission || 0);
    const k = new Date(o.created_at).toISOString().slice(0, 10);
    if (commissionDays[k] !== undefined) commissionDays[k] += c;
    const cc = commissionCities[o.city] || (commissionCities[o.city] = { total: 0, unpaid: 0 });
    cc.total += c;
    if (o.commission_status === "unpaid") cc.unpaid += c;
    if (c === 0 && o.status === "completed") zeroCommissionCount++;
  });
  const totalCommission = orders.reduce((a: number, o: any) => a + Number(o.app_commission || 0), 0);
  const totalUnpaidCommission = orders.filter((o: any) => o.commission_status === "unpaid").reduce((a: number, o: any) => a + Number(o.app_commission || 0), 0);

  return (
    <AdminShell title="التقارير">
      <div className="space-y-6">
        {/* Daily */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-bold">الطلبات اليومية (آخر 7 أيام)</h2>
            <span className="text-xs text-muted-foreground">إجمالي الإيرادات: <span className="font-bold text-primary">{totalRevenue.toLocaleString("ar-EG")} ر.ي</span></span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">التاريخ</th>
                <th className="text-right p-3">عدد الطلبات</th>
                <th className="text-right p-3">الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(days).map(([k, v]) => (
                <tr key={k} className="border-t border-border">
                  <td className="p-3">{new Date(k).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="p-3">{v.count}</td>
                  <td className="p-3 font-semibold">{v.revenue.toLocaleString("ar-EG")} ر.ي</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cities */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-4 border-b border-border"><h2 className="font-display font-bold">الطلبات حسب المدينة</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">المدينة</th>
                <th className="text-right p-3">إجمالي الطلبات</th>
                <th className="text-right p-3">الإيرادات</th>
                <th className="text-right p-3">الملغية/المرفوضة</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cities).sort((a, b) => b[1].revenue - a[1].revenue).map(([city, v]) => (
                <tr key={city} className="border-t border-border">
                  <td className="p-3 font-medium">{city}</td>
                  <td className="p-3">{v.count}</td>
                  <td className="p-3 font-semibold">{v.revenue.toLocaleString("ar-EG")} ر.ي</td>
                  <td className="p-3 text-rose-600">{v.cancelled}</td>
                </tr>
              ))}
              {Object.keys(cities).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">لا توجد بيانات</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Drivers */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-4 border-b border-border"><h2 className="font-display font-bold">أداء السائقين</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">السائق</th>
                <th className="text-right p-3">عدد الطلبات</th>
                <th className="text-right p-3">إجمالي الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(drvStats).sort((a, b) => b.revenue - a.revenue).map((s, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{s.count}</td>
                  <td className="p-3 font-semibold">{s.revenue.toLocaleString("ar-EG")} ر.ي</td>
                </tr>
              ))}
              {Object.keys(drvStats).length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground text-sm">لا يوجد سائقون</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Cancelled */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-4 border-b border-border"><h2 className="font-display font-bold">الطلبات الملغية والمرفوضة ({cancelled.length})</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">الرقم</th>
                <th className="text-right p-3">المدينة</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {cancelled.slice(0, 20).map((o: any) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3">{o.city}</td>
                  <td className="p-3"><span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-xs">{o.status}</span></td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar-EG")}</td>
                </tr>
              ))}
              {cancelled.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">لا توجد طلبات ملغية</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
