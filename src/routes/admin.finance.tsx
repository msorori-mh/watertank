import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Loader2, Wallet, Banknote, Truck, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/admin/finance")({
  component: AdminFinance,
});

function AdminFinance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: orders }, { data: drivers }] = await Promise.all([
      supabase.from("orders").select("id,price,status,payment_status,payment_collected_at,driver_id,city,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("drivers").select("id,name,balance,phone"),
    ]);
    setData({ orders: orders || [], drivers: drivers || [] });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading || !data) return <AdminShell title="المالية والتحصيل"><div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div></AdminShell>;

  const completed = data.orders.filter((o: any) => o.status === "completed");
  const totalRevenue = completed.reduce((a: number, o: any) => a + Number(o.price), 0);
  const collected = data.orders.filter((o: any) => o.payment_status === "paid");
  const totalCollected = collected.reduce((a: number, o: any) => a + Number(o.price), 0);
  const unpaid = data.orders.filter((o: any) => o.payment_status !== "paid" && ["delivering", "payment_collected", "completed"].includes(o.status));
  const unpaidTotal = unpaid.reduce((a: number, o: any) => a + Number(o.price), 0);
  const driverBalances = data.drivers.reduce((a: number, d: any) => a + Number(d.balance || 0), 0);

  const cards = [
    { label: "إجمالي الإيرادات", value: totalRevenue, icon: Wallet, color: "bg-primary/10 text-primary" },
    { label: "محصّل نقداً", value: totalCollected, icon: Banknote, color: "bg-emerald-50 text-emerald-700" },
    { label: "عهدة السائقين", value: driverBalances, icon: Truck, color: "bg-blue-50 text-blue-700" },
    { label: "غير مدفوع", value: unpaidTotal, icon: AlertCircle, color: "bg-rose-50 text-rose-700" },
  ];

  return (
    <AdminShell title="المالية والتحصيل">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl p-5 shadow-[var(--shadow-soft)]">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.color} mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-display font-bold text-2xl mt-1">{c.value.toLocaleString("ar-EG")} <span className="text-sm">ر.ي</span></p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-bold">عهد السائقين</h2>
            <span className="text-xs text-muted-foreground">المبلغ المحصّل والمستحق التسليم</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">السائق</th>
                <th className="text-right p-3">الهاتف</th>
                <th className="text-right p-3">العهدة الحالية</th>
                <th className="text-right p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data.drivers.map((d: any) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3" dir="ltr">{d.phone}</td>
                  <td className="p-3 font-semibold">{Number(d.balance || 0).toLocaleString("ar-EG")} ر.ي</td>
                  <td className="p-3">
                    {Number(d.balance || 0) > 0 && (
                      <button onClick={async () => {
                        if (!confirm(`تأكيد استلام ${Number(d.balance).toLocaleString("ar-EG")} ر.ي من ${d.name}؟`)) return;
                        await supabase.from("drivers").update({ balance: 0 }).eq("id", d.id);
                        load();
                      }}
                        className="rounded-lg bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-semibold hover:bg-emerald-200">
                        تصفير العهدة
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-bold">آخر التحصيلات النقدية</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">الطلب</th>
                <th className="text-right p-3">المدينة</th>
                <th className="text-right p-3">المبلغ</th>
                <th className="text-right p-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {collected.slice(0, 15).map((o: any) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3">{o.city}</td>
                  <td className="p-3 font-semibold">{Number(o.price).toLocaleString("ar-EG")} ر.ي</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {o.payment_collected_at ? new Date(o.payment_collected_at).toLocaleString("ar-EG") : "—"}
                  </td>
                </tr>
              ))}
              {collected.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">لا توجد تحصيلات بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
