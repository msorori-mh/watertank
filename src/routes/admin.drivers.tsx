import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { adminRouteGuard } from "@/lib/route-guards";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/drivers")({
  ...adminRouteGuard,
  component: AdminDrivers,
});

function AdminDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
    setDrivers(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (driver: any, patch: any) => {
    const { error } = await supabase.from("drivers").update(patch).eq("id", driver.id);
    if (error) { alert("تعذر التحديث: " + error.message); return; }

    // إشعار السائق بقرار الإدارة
    const decision =
      patch.license_status === "approved" ? "driver_approved"
      : patch.license_status === "rejected" ? "driver_rejected"
      : null;
    if (decision && driver.user_id) {
      const msg = DRIVER_ACCOUNT_MESSAGES[decision];
      await notifyUser(driver.user_id, null, decision, msg.title, msg.body);
    }
    load();
  };

  return (
    <AdminShell title="إدارة السائقين">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">الاسم</th>
                <th className="text-right p-3">الهاتف</th>
                <th className="text-right p-3">المدينة</th>
                <th className="text-right p-3">المركبة</th>
                <th className="text-right p-3">السعة</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">التوفر</th>
                <th className="text-right p-3">التقييم</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3" dir="ltr">{d.phone}</td>
                  <td className="p-3">{d.city || "—"}</td>
                  <td className="p-3 font-mono text-xs">{d.vehicle_plate}</td>
                  <td className="p-3">{d.vehicle_capacity.toLocaleString("ar-EG")} لتر</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      d.license_status === "approved" ? "bg-emerald-100 text-emerald-700"
                      : d.license_status === "rejected" ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                    }`}>{d.license_status}</span>
                  </td>
                  <td className="p-3">{d.availability}</td>
                  <td className="p-3">{Number(d.rating).toFixed(1)} ⭐</td>
                  <td className="p-3 flex gap-1">
                    {d.license_status !== "approved" && (
                      <button onClick={() => update(d.id, { license_status: "approved" })}
                        className="rounded-lg bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-semibold hover:bg-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 inline" /> موافقة
                      </button>
                    )}
                    {d.license_status !== "rejected" && (
                      <button onClick={() => update(d.id, { license_status: "rejected" })}
                        className="rounded-lg bg-rose-100 text-rose-700 px-2 py-1 text-xs font-semibold hover:bg-rose-200">
                        <XCircle className="h-3.5 w-3.5 inline" /> حظر
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">لا يوجد سائقون</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
