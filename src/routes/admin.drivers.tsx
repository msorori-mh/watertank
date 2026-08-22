import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { adminRouteGuard } from "@/lib/route-guards";
import { Loader2, CheckCircle2, XCircle, Plus, KeyRound } from "lucide-react";
import { notifyUser, DRIVER_ACCOUNT_MESSAGES } from "@/lib/notifications";

export const Route = createFileRoute("/admin/drivers")({
  ...adminRouteGuard,
  component: AdminDrivers,
});

function AdminDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [form, setForm] = useState({ phone: "", password: "", city: "" });
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = async () => {
    const [{ data, error }, { data: cityRows }] = await Promise.all([
      supabase.from("drivers").select("*").order("created_at", { ascending: false }),
      supabase.from("cities").select("name").eq("is_active", true).order("name"),
    ]);
    if (error) setMessage({ kind: "error", text: "تعذر تحميل السائقين: " + error.message });
    setDrivers(data || []);
    setCities((cityRows || []).map((row: any) => row.name));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const provisionDriver = async () => {
    if (!form.phone.trim() || form.password.length < 8) {
      setMessage({ kind: "error", text: "أدخل رقم الهاتف وكلمة مرور مؤقتة من 8 أحرف على الأقل." });
      return;
    }
    setProvisioning(true);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke("admin-create-driver", { body: form });
    setProvisioning(false);
    if (error || !data?.ok) {
      setMessage({ kind: "error", text: "تعذر إنشاء حساب السائق: " + (data?.error || error?.message || "خطأ غير متوقع") });
      return;
    }
    setMessage({ kind: "ok", text: "تم إنشاء حساب السائق. عند أول دخول سيُطلب منه استكمال بيانات المركبة والملف الشخصي." });
    setForm({ phone: "", password: "", city: "" });
  };

  const update = async (driver: any, patch: any) => {
    const { error } = await supabase.from("drivers").update(patch).eq("id", driver.id);
    if (error) { setMessage({ kind: "error", text: "تعذر التحديث: " + error.message }); return; }

    const decision =
      patch.license_status === "approved" ? "driver_approved"
      : patch.license_status === "rejected" ? "driver_rejected"
      : null;
    if (decision && driver.user_id) {
      const msg = DRIVER_ACCOUNT_MESSAGES[decision];
      await notifyUser(driver.user_id, null, decision, msg.title, msg.body);
    }
    await load();
  };

  return (
    <AdminShell title="إدارة السائقين">
      {message && (
        <div role="alert" className={`mb-4 rounded-xl border p-3 text-sm ${message.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {message.text}
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> إضافة سائق جديد</h2>
        <p className="mt-1 text-xs text-muted-foreground">أنشئ بيانات الدخول فقط، وسيستكمل السائق اسمه وبيانات المركبة والوثائق عند أول دخول.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div><label className="text-xs text-muted-foreground">رقم الهاتف</label>
            <input dir="ltr" inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="77XXXXXXX" className="w-full rounded-lg border border-border px-3 py-2 text-sm" /></div>
          <div><label className="text-xs text-muted-foreground">كلمة مرور مؤقتة</label>
            <div className="relative"><KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-border pr-9 pl-3 py-2 text-sm" /></div></div>
          <div><label className="text-xs text-muted-foreground">المدينة المبدئية</label>
            <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="">يحددها السائق لاحقًا</option>
              {cities.map(city => <option key={city} value={city}>{city}</option>)}
            </select></div>
          <div className="flex items-end"><button onClick={provisionDriver} disabled={provisioning}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2">
            {provisioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إنشاء الحساب
          </button></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-x-auto">
        {loading ? <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div> : (
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-xs text-muted-foreground"><tr>
              <th className="text-right p-3">الاسم</th><th className="text-right p-3">الهاتف</th>
              <th className="text-right p-3">المدينة</th><th className="text-right p-3">المركبة</th>
              <th className="text-right p-3">السعة</th><th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">التوفر</th><th className="text-right p-3">التقييم</th>
              <th className="text-right p-3">إجراءات</th>
            </tr></thead>
            <tbody>
              {drivers.map(d => <tr key={d.id} className="border-t border-border">
                <td className="p-3 font-medium">{d.name || "لم يستكمل البيانات"}</td>
                <td className="p-3" dir="ltr">{d.phone}</td><td className="p-3">{d.city || "—"}</td>
                <td className="p-3 font-mono text-xs">{d.vehicle_plate || "—"}</td>
                <td className="p-3">{d.vehicle_capacity ? d.vehicle_capacity.toLocaleString("ar-EG") + " لتر" : "—"}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.license_status === "approved" ? "bg-emerald-100 text-emerald-700" : d.license_status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{d.license_status}</span></td>
                <td className="p-3">{d.availability}</td><td className="p-3">{Number(d.rating).toFixed(1)} ⭐</td>
                <td className="p-3 flex gap-1">
                  {d.license_status !== "approved" && <button onClick={() => update(d, { license_status: "approved", status: "active" })}
                    className="rounded-lg bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-semibold"><CheckCircle2 className="h-3.5 w-3.5 inline" /> موافقة</button>}
                  {d.license_status !== "rejected" && <button onClick={() => update(d, { license_status: "rejected", status: "inactive" })}
                    className="rounded-lg bg-rose-100 text-rose-700 px-2 py-1 text-xs font-semibold"><XCircle className="h-3.5 w-3.5 inline" /> حظر</button>}
                </td>
              </tr>)}
              {drivers.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">لا يوجد سائقون</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
