import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Loader2, Plus, Trash2, Percent, Pencil, X, Save } from "lucide-react";

export const Route = createFileRoute("/admin/commissions")({
  component: AdminCommissions,
});

type Rule = {
  id: string;
  city: string | null;
  capacity: number | null;
  commission_type: "fixed" | "percentage";
  commission_value: number;
  free_until: string | null;
  is_active: boolean;
};

const empty: Omit<Rule, "id"> = {
  city: null, capacity: null, commission_type: "fixed",
  commission_value: 0, free_until: null, is_active: true,
};

function AdminCommissions() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Omit<Rule, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from("commission_settings").select("*").order("created_at", { ascending: false }),
      supabase.from("cities").select("name").eq("is_active", true),
    ]);
    setRules((r as any) || []);
    setCities((c || []).map((x: any) => x.name));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(empty); setEditingId(null); };

  const startEdit = (r: Rule) => {
    setEditingId(r.id);
    setForm({
      city: r.city,
      capacity: r.capacity,
      commission_type: r.commission_type,
      commission_value: Number(r.commission_value),
      free_until: r.free_until,
      is_active: r.is_active,
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      capacity: form.capacity ? Number(form.capacity) : null,
      commission_value: Number(form.commission_value),
      free_until: form.free_until || null,
      city: form.city || null,
    };
    const { error } = editingId
      ? await supabase.from("commission_settings").update(payload).eq("id", editingId)
      : await supabase.from("commission_settings").insert(payload);
    setSaving(false);
    if (error) { alert("تعذر الحفظ: " + error.message); return; }
    resetForm();
    load();
  };

  const toggle = async (r: Rule) => {
    await supabase.from("commission_settings").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذه القاعدة؟")) return;
    await supabase.from("commission_settings").delete().eq("id", id);
    load();
  };

  return (
    <AdminShell title="إعدادات عمولة التطبيق">
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-5 text-sm text-amber-900">
        <p className="font-semibold mb-1 flex items-center gap-2"><Percent className="h-4 w-4" /> طريقة الاحتساب</p>
        <p className="text-xs leading-6">
          العميل يدفع قيمة الطلب كاملة للسائق. التطبيق لا يستلم قيمة الطلب، بل يستحق عمولة على السائق فقط.
          تُحسب العمولة لحظة اعتماد الطلب (pending → approved) وتُسجَّل كدين على السائق عند تحصيل المبلغ.
          تُختار القاعدة الأكثر تخصيصاً (مدينة + سعة أولاً، ثم مدينة، ثم سعة، ثم القاعدة العامة).
        </p>
      </div>

      <div ref={formRef} className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-5 mb-6">
        <h2 className="font-display font-bold mb-4">{editingId ? "تعديل قاعدة عمولة" : "إضافة قاعدة عمولة"}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs text-muted-foreground">المدينة</label>
            <select value={form.city ?? ""} onChange={e => setForm({ ...form, city: e.target.value || null })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="">كل المدن</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">سعة الوايت (لتر)</label>
            <input type="number" value={form.capacity ?? ""} onChange={e => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : null })}
              placeholder="كل السعات" className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">نوع العمولة</label>
            <select value={form.commission_type} onChange={e => setForm({ ...form, commission_type: e.target.value as any })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="fixed">ثابتة (ر.ي)</option>
              <option value="percentage">نسبة (%)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">قيمة العمولة</label>
            <input type="number" min={0} value={form.commission_value} onChange={e => setForm({ ...form, commission_value: Number(e.target.value) })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">فترة مجانية حتى</label>
            <input type="date" value={form.free_until ?? ""} onChange={e => setForm({ ...form, free_until: e.target.value || null })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={save} disabled={saving}
              className="flex-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "حفظ التعديلات" : "حفظ القاعدة"}
            </button>
            {editingId && (
              <button onClick={resetForm} type="button"
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold flex items-center gap-1 hover:bg-slate-50">
                <X className="h-4 w-4" /> إلغاء
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-display font-bold">القواعد المسجلة</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">المدينة</th>
                <th className="text-right p-3">السعة</th>
                <th className="text-right p-3">النوع</th>
                <th className="text-right p-3">القيمة</th>
                <th className="text-right p-3">مجاني حتى</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{r.city || "كل المدن"}</td>
                  <td className="p-3">{r.capacity ? r.capacity.toLocaleString("ar-EG") + " لتر" : "كل السعات"}</td>
                  <td className="p-3">{r.commission_type === "fixed" ? "ثابتة" : "نسبة"}</td>
                  <td className="p-3 font-semibold">
                    {Number(r.commission_value).toLocaleString("ar-EG")}
                    {r.commission_type === "fixed" ? " ر.ي" : " %"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{r.free_until || "—"}</td>
                  <td className="p-3">
                    <button onClick={() => toggle(r)}
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {r.is_active ? "فعّالة" : "معطّلة"}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(r)}
                        className={`p-1.5 rounded ${editingId === r.id ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}
                        title="تعديل">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(r.id)} className="text-rose-600 hover:bg-rose-50 p-1.5 rounded" title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">لا توجد قواعد بعد — العمولة الافتراضية = 0</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
