import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { adminRouteGuard } from "@/lib/route-guards";
import { ClipboardList, Truck, Wallet, Activity } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  ...adminRouteGuard,
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ today: 0, pending: 0, drivers: 0, revenue: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const todayIso = new Date(); todayIso.setHours(0, 0, 0, 0);
    const [{ data: orders }, { data: drivers }] = await Promise.all([
      supabase.from("orders").select("id,price,status,created_at,city,capacity").order("created_at", { ascending: false }).limit(200),
      supabase.from("drivers").select("id,availability,license_status"),
    ]);
    const today = (orders || []).filter(o => new Date(o.created_at) >= todayIso);
    const pending = (orders || []).filter(o => o.status === "pending").length;
    const revenue = today.filter(o => o.status === "completed").reduce((a, o) => a + Number(o.price), 0);
    const activeDrivers = (drivers || []).filter(d => d.availability === "available" && d.license_status === "approved").length;
    setStats({ today: today.length, pending, drivers: activeDrivers, revenue });
    setRecent((orders || []).slice(0, 8));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cards = [
    { label: "طلبات اليوم", value: stats.today, icon: ClipboardList, color: "bg-blue-50 text-blue-700" },
    { label: "قيد المراجعة", value: stats.pending, icon: Activity, color: "bg-amber-50 text-amber-700" },
    { label: "سائقون متاحون", value: stats.drivers, icon: Truck, color: "bg-emerald-50 text-emerald-700" },
    { label: "قيمة الطلبات المكتملة اليوم (ر.ي)", value: stats.revenue.toLocaleString("ar-EG"), icon: Wallet, color: "bg-primary/10 text-primary" },
  ];

  return (
    <AdminShell title="لوحة التحكم">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl p-5 shadow-[var(--shadow-soft)]">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.color} mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-display font-bold text-2xl mt-1">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-display font-bold">آخر الطلبات</h2>
        </div>
        {loading ? (
          <p className="p-8 text-center text-muted-foreground text-sm">جاري التحميل…</p>
        ) : recent.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-muted-foreground text-xs">
              <tr>
                <th className="text-right p-3">الرقم</th>
                <th className="text-right p-3">المدينة</th>
                <th className="text-right p-3">الحجم</th>
                <th className="text-right p-3">السعر</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(o => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">#{o.id.slice(0,8).toUpperCase()}</td>
                  <td className="p-3">{o.city}</td>
                  <td className="p-3">{o.capacity.toLocaleString("ar-EG")} لتر</td>
                  <td className="p-3 font-semibold">{Number(o.price).toLocaleString("ar-EG")} ر.ي</td>
                  <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{o.status}</span></td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar-EG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
