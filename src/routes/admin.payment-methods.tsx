import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Loader2, Plus, Trash2, Upload, Pencil, X, Landmark, Send, Smartphone } from "lucide-react";

export const Route = createFileRoute("/admin/payment-methods")({
  component: AdminPaymentMethods,
});

type PMType = "bank_deposit" | "unified_transfer" | "pos_point";

type PM = {
  id: string;
  name: string;
  type: PMType;
  provider_name: string | null;       // bank_deposit: bank name
  account_holder_name: string | null; // bank_deposit: account holder | unified_transfer: recipient | pos_point: owner
  account_number: string | null;      // bank_deposit: account number | pos_point: point number
  phone_number: string | null;        // unified_transfer: recipient phone
  qr_code_url: string | null;         // bank_deposit: QR
  instructions: string | null;
  is_active: boolean;
};

const TYPE_META: Record<PMType, { label: string; icon: typeof Landmark; color: string }> = {
  bank_deposit:     { label: "إيداع بنكي",                icon: Landmark,   color: "bg-blue-50 text-blue-700" },
  unified_transfer: { label: "تحويل عبر الشبكة الموحدة", icon: Send,       color: "bg-emerald-50 text-emerald-700" },
  pos_point:        { label: "سداد عبر نقطة حاسب",       icon: Smartphone, color: "bg-amber-50 text-amber-700" },
};

const empty: Omit<PM, "id"> = {
  name: "",
  type: "bank_deposit",
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

  const validate = (e: typeof editing): string | null => {
    if (!e) return "بيانات غير مكتملة";
    if (!e.name.trim()) return "اسم الطريقة مطلوب";
    if (e.type === "bank_deposit") {
      if (!e.provider_name?.trim()) return "اسم البنك مطلوب";
      if (!e.account_holder_name?.trim()) return "اسم صاحب الحساب مطلوب";
      if (!e.account_number?.trim()) return "رقم الحساب مطلوب";
    } else if (e.type === "unified_transfer") {
      if (!e.account_holder_name?.trim()) return "اسم المستلم مطلوب";
      if (!e.phone_number?.trim()) return "رقم هاتف المستلم مطلوب";
    } else if (e.type === "pos_point") {
      if (!e.account_holder_name?.trim()) return "اسم صاحب النقطة مطلوب";
      if (!e.account_number?.trim()) return "رقم النقطة مطلوب";
    }
    return null;
  };

  const save = async () => {
    if (!editing) return;
    const err = validate(editing);
    if (err) { alert(err); return; }
    setSaving(true);

    // Build payload — only include relevant fields per type, null out the rest
    const base: any = {
      name: editing.name.trim(),
      type: editing.type,
      instructions: editing.instructions?.trim() || null,
      is_active: editing.is_active,
      provider_name: null,
      account_holder_name: null,
      account_number: null,
      phone_number: null,
      qr_code_url: null,
    };
    if (editing.type === "bank_deposit") {
      base.provider_name = editing.provider_name?.trim() || null;
      base.account_holder_name = editing.account_holder_name?.trim() || null;
      base.account_number = editing.account_number?.trim() || null;
      base.qr_code_url = editing.qr_code_url || null;
    } else if (editing.type === "unified_transfer") {
      base.account_holder_name = editing.account_holder_name?.trim() || null;
      base.phone_number = editing.phone_number?.trim() || null;
    } else if (editing.type === "pos_point") {
      base.account_holder_name = editing.account_holder_name?.trim() || null;
      base.account_number = editing.account_number?.trim() || null;
    }

    let res;
    if ((editing as PM).id) {
      res = await supabase.from("payment_methods" as any).update(base).eq("id", (editing as PM).id);
    } else {
      res = await supabase.from("payment_methods" as any).insert(base);
    }
    setSaving(false);
    if (res.error) { alert("فشل الحفظ: " + res.error.message); return; }
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
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
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
          {items.map((pm) => {
            const meta = TYPE_META[pm.type] ?? TYPE_META.bank_deposit;
            const Icon = meta.icon;
            return (
              <div key={pm.id} className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-lg truncate">{pm.name}</h3>
                        {!pm.is_active && <span className="text-xs rounded-full bg-muted text-muted-foreground px-2 py-0.5">معطّلة</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta.label}</p>
                    </div>
                  </div>
                  {pm.qr_code_url && (
                    <img src={pm.qr_code_url} alt="QR" className="h-16 w-16 rounded-lg object-cover border border-border" />
                  )}
                </div>

                <div className="space-y-1.5 text-sm">
                  {pm.type === "bank_deposit" && (
                    <>
                      {pm.provider_name && <p><span className="text-muted-foreground">اسم البنك:</span> {pm.provider_name}</p>}
                      {pm.account_holder_name && <p><span className="text-muted-foreground">صاحب الحساب:</span> {pm.account_holder_name}</p>}
                      {pm.account_number && <p><span className="text-muted-foreground">رقم الحساب:</span> <span className="font-mono">{pm.account_number}</span></p>}
                    </>
                  )}
                  {pm.type === "unified_transfer" && (
                    <>
                      {pm.account_holder_name && <p><span className="text-muted-foreground">اسم المستلم:</span> {pm.account_holder_name}</p>}
                      {pm.phone_number && <p><span className="text-muted-foreground">رقم الهاتف:</span> <span className="font-mono">{pm.phone_number}</span></p>}
                    </>
                  )}
                  {pm.type === "pos_point" && (
                    <>
                      {pm.account_holder_name && <p><span className="text-muted-foreground">صاحب النقطة:</span> {pm.account_holder_name}</p>}
                      {pm.account_number && <p><span className="text-muted-foreground">رقم النقطة:</span> <span className="font-mono">{pm.account_number}</span></p>}
                    </>
                  )}
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
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-display font-bold">{(editing as PM).id ? "تعديل طريقة الدفع" : "إضافة طريقة دفع"}</h2>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="اسم الطريقة (يظهر للسائق) *">
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder={
                    editing.type === "bank_deposit" ? "مثال: حساب بنك الكريمي" :
                    editing.type === "unified_transfer" ? "مثال: شبكة موحدة - أحمد" :
                    "مثال: نقطة فلوسك"
                  } className="input" />
              </Field>

              <Field label="نوع الطريقة *">
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(TYPE_META) as PMType[]).map((t) => {
                    const m = TYPE_META[t];
                    const Icon = m.icon;
                    const selected = editing.type === t;
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setEditing({ ...editing, type: t })}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-right transition ${
                          selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${m.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Type-specific fields */}
              {editing.type === "bank_deposit" && (
                <>
                  <Field label="اسم البنك *">
                    <input value={editing.provider_name || ""} onChange={(e) => setEditing({ ...editing, provider_name: e.target.value })}
                      placeholder="مثال: بنك الكريمي" className="input" />
                  </Field>
                  <Field label="اسم صاحب الحساب *">
                    <input value={editing.account_holder_name || ""} onChange={(e) => setEditing({ ...editing, account_holder_name: e.target.value })} className="input" />
                  </Field>
                  <Field label="رقم الحساب *">
                    <input value={editing.account_number || ""} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} className="input" inputMode="numeric" />
                  </Field>
                  <Field label="باركود الحساب (QR)">
                    <div className="flex items-center gap-3 flex-wrap">
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
                </>
              )}

              {editing.type === "unified_transfer" && (
                <>
                  <Field label="اسم المستلم *">
                    <input value={editing.account_holder_name || ""} onChange={(e) => setEditing({ ...editing, account_holder_name: e.target.value })} className="input" />
                  </Field>
                  <Field label="رقم هاتف المستلم *">
                    <input value={editing.phone_number || ""} onChange={(e) => setEditing({ ...editing, phone_number: e.target.value })}
                      placeholder="+9677XXXXXXXX" className="input" inputMode="tel" />
                  </Field>
                </>
              )}

              {editing.type === "pos_point" && (
                <>
                  <Field label="اسم صاحب النقطة *">
                    <input value={editing.account_holder_name || ""} onChange={(e) => setEditing({ ...editing, account_holder_name: e.target.value })} className="input" />
                  </Field>
                  <Field label="رقم النقطة *">
                    <input value={editing.account_number || ""} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })}
                      placeholder="مثال: 700123456" className="input" inputMode="numeric" />
                  </Field>
                </>
              )}

              <Field label="تعليمات الدفع (اختياري)">
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
            <div className="p-5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-white">
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
