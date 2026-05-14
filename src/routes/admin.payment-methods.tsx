import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Loader2, Plus, Trash2, Upload, Pencil, X } from "lucide-react";

export const Route = createFileRoute("/admin/payment-methods")({
  component: AdminPaymentMethods,
});

type PM = {
  id: string;
  name: string;
  type: "bank" | "transfer_network" | "direct_transfer" | "other";
  provider_name: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  phone_number: string | null;
  qr_code_url: string | null;
  instructions: string | null;
  is_active: boolean;
};

const TYPE_LABELS: Record<PM["type"], string> = {
  bank: "بنك",
  transfer_network: "شبكة تحويل",
  direct_transfer: "حوالة مباشرة",
  other: "أخرى",
};

const empty: Omit<PM, "id"> = {
  name: "",
  type: "bank",
  provider_name: "",
  account_holder_name: "",
  account_number: "",
  phone_number: "",
  qr_code_url: "",
  instructions: "",
  is_active: true,
};

function AdminPaymentMethods() {
  const [items, setItems] = useState<PM[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PM | (Omit<PM, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payment_methods" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from("payment_methods" as any).update({ is_active }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف طريقة الدفع؟")) return;
    await supabase.from("payment_methods" as any).delete().eq("id", id);
    load();
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { alert("الاسم مطلوب"); return; }
    setSaving(true);
    const payload: any = {
      name: editing.name.trim(),
      type: editing.type,
      provider_name: editing.provider_name || null,
      account_holder_name: editing.account_holder_name || null,
      account_number: editing.account_number || null,
      phone_number: editing.phone_number || null,
      qr_code_url: editing.qr_code_url || null,
      instructions: editing.instructions || null,
      is_active: editing.is_active,
    };
    if ((editing as PM).id) {
      await supabase.from("payment_methods" as any).update(payload).eq("id", (editing as PM).id);
    } else {
      await supabase.from("payment_methods" as any).insert(payload);
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const uploadQR = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `qr/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("payment-qr").upload(path, file, { upsert: false });
    if (!error) {
      const { data: pub } = supabase.storage.from("payment-qr").getPublicUrl(path);
      setEditing((e) => e ? { ...e, qr_code_url: pub.publicUrl } : e);
    } else {
      alert("فشل رفع الصورة: " + error.message);
    }
    setUploading(false);
  };

  return (
    <AdminShell title="طرق الدفع">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">إدارة قنوات الدفع التي يستخدمها السائقون لتسديد عمولات التطبيق.</p>
        <button
          onClick={() => setEditing({ ...empty })}
          className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-semibold flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> إضافة طريقة
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-10 text-center text-muted-foreground">
          لا توجد طرق دفع بعد. أضف أول طريقة من الزر أعلاه.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((pm) => (
            <div key={pm.id} className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-lg truncate">{pm.name}</h3>
                    <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">{TYPE_LABELS[pm.type]}</span>
                    {!pm.is_active && <span className="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5">معطّلة</span>}
                  </div>
                  {pm.provider_name && <p className="text-sm text-muted-foreground mt-0.5">{pm.provider_name}</p>}
                </div>
                {pm.qr_code_url && (
                  <img src={pm.qr_code_url} alt="QR" className="h-16 w-16 rounded-lg object-cover border border-border" />
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                {pm.account_holder_name && <p><span className="text-muted-foreground">صاحب الحساب:</span> {pm.account_holder_name}</p>}
                {pm.account_number && <p><span className="text-muted-foreground">رقم الحساب:</span> <span className="font-mono">{pm.account_number}</span></p>}
                {pm.phone_number && <p><span className="text-muted-foreground">رقم الهاتف:</span> <span className="font-mono">{pm.phone_number}</span></p>}
                {pm.instructions && <p className="text-muted-foreground whitespace-pre-wrap mt-2 text-xs bg-slate-50 rounded-lg p-2">{pm.instructions}</p>}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={pm.is_active} onChange={(e) => toggle(pm.id, e.target.checked)} />
                  مفعّلة
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(pm)} className="text-primary hover:bg-primary/10 p-2 rounded-lg"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(pm.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-display font-bold">{(editing as PM).id ? "تعديل طريقة الدفع" : "إضافة طريقة دفع"}</h2>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="الاسم *">
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="مثال: بنك الكريمي" className="input" />
              </Field>
              <Field label="النوع">
                <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as PM["type"] })} className="input">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="اسم المزود (اختياري)">
                <input value={editing.provider_name || ""} onChange={(e) => setEditing({ ...editing, provider_name: e.target.value })}
                  placeholder="مثال: Kuraimi Bank" className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="اسم صاحب الحساب">
                  <input value={editing.account_holder_name || ""} onChange={(e) => setEditing({ ...editing, account_holder_name: e.target.value })} className="input" />
                </Field>
                <Field label="رقم الحساب">
                  <input value={editing.account_number || ""} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} className="input" />
                </Field>
              </div>
              <Field label="رقم الهاتف">
                <input value={editing.phone_number || ""} onChange={(e) => setEditing({ ...editing, phone_number: e.target.value })}
                  placeholder="+9677XXXXXXXX" className="input" />
              </Field>

              <Field label="صورة QR (اختياري)">
                <div className="flex items-center gap-3">
                  {editing.qr_code_url && <img src={editing.qr_code_url} alt="QR" className="h-20 w-20 rounded-lg object-cover border border-border" />}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-border hover:border-primary text-sm"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {editing.qr_code_url ? "استبدال" : "رفع صورة"}
                  </button>
                  {editing.qr_code_url && (
                    <button type="button" onClick={() => setEditing({ ...editing, qr_code_url: "" })} className="text-destructive text-xs">إزالة</button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadQR(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </Field>

              <Field label="تعليمات الدفع">
                <textarea
                  value={editing.instructions || ""}
                  onChange={(e) => setEditing({ ...editing, instructions: e.target.value })}
                  placeholder="مثال: حوّل المبلغ ثم أرسل لقطة شاشة عبر واتساب"
                  rows={3}
                  className="input resize-none"
                />
              </Field>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                مفعّلة
              </label>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border border-border">إلغاء</button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;border:2px solid hsl(var(--input,0 0% 90%));border-radius:0.75rem;padding:0.5rem 0.875rem;font-size:0.875rem;outline:none;}.input:focus{border-color:hsl(var(--primary));}`}</style>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
