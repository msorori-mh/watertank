import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const STATUSES = ["pending", "approved", "assigned", "on_the_way", "arrived", "delivering", "completed", "cancelled"] as const;
type Status = typeof STATUSES[number];

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

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: any) => {
    setUpdating(id);
    await supabase.from("orders").update(patch).eq("id", id);
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
            {s} ({orders.filter(o => o.status === s).length})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">الرقم</th>
                <th className="text-right p-3">المدينة</th>
                <th className="text-right p-3">الحجم</th>
                <th className="text-right p-3">السعر</th>
                <th className="text-right p-3">السائق</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">إجراءات</th>
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
                      <select
                        value={o.driver_id || ""}
                        onChange={(e) => update(o.id, { driver_id: e.target.value || null, status: e.target.value ? "assigned" : o.status })}
                        className="rounded border border-border px-2 py-1 text-xs"
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
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      {updating === o.id && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
