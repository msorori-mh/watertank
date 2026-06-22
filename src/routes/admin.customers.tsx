import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { adminRouteGuard } from "@/lib/route-guards";
import { Loader2, Power } from "lucide-react";

export const Route = createFileRoute("/admin/customers")({
  ...adminRouteGuard,
  component: AdminCustomers,
});

function AdminCustomers() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("type", "customer")
      .order("created_at", { ascending: false });
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_id,created_at,status,price");

    const list = (profiles || []).map(p => {
      const my = (orders || []).filter(o => o.customer_id === p.id);
      const last = my.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
      return {
        ...p,
        orders_count: my.length,
        last_order_at: last?.created_at || null,
        last_status: last?.status || null,
        spent: my.filter(o => o.status === "completed").reduce((a, o) => a + Number(o.price), 0),
      };
    });
    setRows(list); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, current: boolean) => {
    await supabase.from("profiles").update({ is_active: !current }).eq("id", id);
    load();
  };

  return (
    <AdminShell title="إدارة العملاء">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">الاسم</th>
                <th className="text-right p-3">الهاتف</th>
                <th className="text-right p-3">المدينة</th>
                <th className="text-right p-3">عدد الطلبات</th>
                <th className="text-right p-3">آخر طلب</th>
                <th className="text-right p-3">الإنفاق</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.name || "—"}</td>
                  <td className="p-3" dir="ltr">{r.phone || "—"}</td>
                  <td className="p-3">{r.city || "—"}</td>
                  <td className="p-3">{r.orders_count.toLocaleString("ar-EG")}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {r.last_order_at ? new Date(r.last_order_at).toLocaleString("ar-EG") : "—"}
                    {r.last_status && <span className="block text-[10px]">({r.last_status})</span>}
                  </td>
                  <td className="p-3 font-semibold">{r.spent.toLocaleString("ar-EG")} ر.ي</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {r.is_active ? "مفعّل" : "معطّل"}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggle(r.id, r.is_active)}
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${r.is_active ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>
                      <Power className="h-3 w-3 inline" /> {r.is_active ? "تعطيل" : "تفعيل"}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">لا يوجد عملاء</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
