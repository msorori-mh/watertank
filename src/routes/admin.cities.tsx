import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { adminRouteGuard } from "@/lib/route-guards";
import { Loader2, Plus, Trash2, Pencil, Save, X, Power } from "lucide-react";
import { TANK_CAPACITIES } from "@/lib/capacities";

export const Route = createFileRoute("/admin/cities")({
  ...adminRouteGuard,
  component: AdminCities,
});

const SIZES = [...TANK_CAPACITIES];

function AdminCities() {
  const [cities, setCities] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [newCity, setNewCity] = useState("");
  const [editing, setEditing] = useState<{ id: string; original: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    const [{ data: c, error: ce }, { data: p, error: pe }] = await Promise.all([
      supabase.from("cities").select("*").order("name"),
      supabase.from("pricing").select("*"),
    ]);
    if (ce || pe) setError(ce?.message || pe?.message || "تعذر تحميل البيانات");
    setCities(c || []);
    setPricing(p || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addCity = async () => {
    const name = newCity.trim();
    if (!name) return;
    if (cities.some(c => c.name.trim().toLowerCase() === name.toLowerCase())) {
      setError("هذه المدينة مضافة مسبقًا.");
      return;
    }
    setBusy("new");
    setError("");
    const { error: e } = await supabase.from("cities").insert({ name, is_active: true });
    setBusy(null);
    if (e) { setError("تعذر إضافة المدينة: " + e.message); return; }
    setNewCity("");
    await load();
  };

  const toggleCity = async (id: string, active: boolean) => {
    setBusy(id);
    const { error: e } = await supabase.from("cities").update({ is_active: active }).eq("id", id);
    setBusy(null);
    if (e) { setError("تعذر تغيير حالة المدينة: " + e.message); return; }
    await load();
  };

  const renameCity = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return;
    if (cities.some(c => c.id !== editing.id && c.name.trim().toLowerCase() === name.toLowerCase())) {
      setError("يوجد اسم مدينة مطابق.");
      return;
    }
    setBusy(editing.id);
    setError("");
    const { error: cityError } = await supabase.from("cities").update({ name }).eq("id", editing.id);
    if (!cityError && name !== editing.original) {
      const { error: priceError } = await supabase.from("pricing").update({ city: name }).eq("city", editing.original);
      if (priceError) {
        await supabase.from("cities").update({ name: editing.original }).eq("id", editing.id);
        setBusy(null);
        setError("تعذر تحديث الأسعار المرتبطة، ولم يُغيّر اسم المدينة.");
        return;
      }
    }
    setBusy(null);
    if (cityError) { setError("تعذر تعديل المدينة: " + cityError.message); return; }
    setEditing(null);
    await load();
  };

  const deleteCity = async (city: any) => {
    const [{ count: orders }, { count: drivers }, { count: prices }] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("city", city.name),
      supabase.from("drivers").select("id", { count: "exact", head: true }).eq("city", city.name),
      supabase.from("pricing").select("id", { count: "exact", head: true }).eq("city", city.name),
    ]);
    if ((orders || 0) > 0 || (drivers || 0) > 0) {
      setError("لا يمكن حذف مدينة مرتبطة بطلبات أو سائقين. تم إيقافها بدلًا من حذفها.");
      await toggleCity(city.id, false);
      return;
    }
    if (!confirm(`حذف مدينة ${city.name} وأسعارها نهائيًا؟`)) return;
    setBusy(city.id);
    if ((prices || 0) > 0) await supabase.from("pricing").delete().eq("city", city.name);
    const { error: e } = await supabase.from("cities").delete().eq("id", city.id);
    setBusy(null);
    if (e) { setError("تعذر حذف المدينة: " + e.message); return; }
    await load();
  };

  const setPrice = async (city: string, capacity: number, price: number) => {
    if (price < 0) { setError("السعر لا يمكن أن يكون سالبًا."); return; }
    const key = `${city}-${capacity}`;
    setBusy(key);
    const existing = pricing.find(p => p.city === city && p.capacity === capacity);
    const { error: e } = existing
      ? await supabase.from("pricing").update({ price }).eq("id", existing.id)
      : await supabase.from("pricing").insert({ city, capacity, price });
    setBusy(null);
    if (e) { setError("تعذر حفظ السعر: " + e.message); return; }
    await load();
  };

  const deletePrice = async (id: string) => {
    const { error: e } = await supabase.from("pricing").delete().eq("id", id);
    if (e) { setError("تعذر حذف السعر: " + e.message); return; }
    await load();
  };

  return (
    <AdminShell title="المدن والأسعار">
      {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-5 mb-6">
        <h2 className="font-display font-bold mb-3">إضافة مدينة جديدة</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={newCity} onChange={e => setNewCity(e.target.value)} onKeyDown={e => e.key === "Enter" && addCity()}
            placeholder="اسم المدينة (مثال: مأرب)" className="flex-1 rounded-xl border-2 border-input px-4 py-2.5 focus:border-primary focus:outline-none" />
          <button onClick={addCity} disabled={busy === "new" || !newCity.trim()}
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-x-auto">
        <div className="p-5 border-b border-border">
          <h2 className="font-display font-bold">المدن وأسعار السعات</h2>
          <p className="text-xs text-muted-foreground mt-1">يمكن تعديل المدينة أو إيقافها أو حذفها بأمان، وحفظ كل سعر عند مغادرة الحقل.</p>
        </div>
        {loading ? <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div> : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-xs text-muted-foreground"><tr>
              <th className="text-right p-3">المدينة</th>
              {SIZES.map(s => <th key={s} className="text-right p-3">{s.toLocaleString("ar-EG")} لتر</th>)}
              <th className="text-right p-3">الحالة والإجراءات</th>
            </tr></thead>
            <tbody>{cities.map(c => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-medium">
                  {editing?.id === c.id ? <div className="flex gap-1">
                    <input autoFocus value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                      className="w-32 rounded border border-border px-2 py-1" />
                    <button onClick={renameCity} title="حفظ"><Save className="h-4 w-4 text-emerald-600" /></button>
                    <button onClick={() => setEditing(null)} title="إلغاء"><X className="h-4 w-4" /></button>
                  </div> : c.name}
                </td>
                {SIZES.map(s => {
                  const row = pricing.find(p => p.city === c.name && p.capacity === s);
                  return <td key={s} className="p-3"><div className="flex gap-1 items-center">
                    <input type="number" min={0} defaultValue={row?.price ?? ""}
                      onBlur={e => { if (e.target.value !== "") { const v = Number(e.target.value); if (v !== Number(row?.price)) setPrice(c.name, s, v); } }}
                      className="w-24 rounded border border-border px-2 py-1 text-sm" placeholder="—" />
                    {busy === `${c.name}-${s}` && <Loader2 className="h-3 w-3 animate-spin" />}
                    {row && <button onClick={() => deletePrice(row.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded" title="حذف السعر"><Trash2 className="h-3 w-3" /></button>}
                  </div></td>;
                })}
                <td className="p-3"><div className="flex flex-wrap gap-1">
                  <button onClick={() => toggleCity(c.id, !c.is_active)}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold flex items-center gap-1 ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    <Power className="h-3 w-3" /> {c.is_active ? "مفعّلة" : "معطّلة"}
                  </button>
                  <button onClick={() => setEditing({ id: c.id, original: c.name, name: c.name })} className="rounded-lg bg-blue-50 text-blue-700 px-2 py-1 text-xs"><Pencil className="h-3 w-3 inline" /> تعديل</button>
                  <button onClick={() => deleteCity(c)} className="rounded-lg bg-rose-50 text-rose-700 px-2 py-1 text-xs"><Trash2 className="h-3 w-3 inline" /> حذف</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
