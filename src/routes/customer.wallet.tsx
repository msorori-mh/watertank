import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Wallet, Plus, Loader2, Upload, X, CheckCircle2, Clock, XCircle, CreditCard } from "lucide-react";

export const Route = createFileRoute("/customer/wallet")({
  component: CustomerWallet,
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
};

type Topup = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  payment_method_id: string | null;
  receipt_url: string | null;
  payment_methods?: { name: string } | null;
};

const TYPE_LABELS: Record<PM["type"], string> = {
  bank: "بنك",
  transfer_network: "شبكة تحويل",
  direct_transfer: "حوالة مباشرة",
  other: "أخرى",
};

const STATUS = {
  pending: { text: "قيد المراجعة", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  approved: { text: "تم الاعتماد", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  rejected: { text: "مرفوض", cls: "bg-rose-100 text-rose-700", Icon: XCircle },
};

function CustomerWallet() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { nav({ to: "/customer/login" }); return; }
      setUser(data.session.user);
    });
  }, [nav]);

  const load = async (uid: string) => {
    setLoading(true);
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from("wallets" as any).select("balance").eq("user_id", uid).maybeSingle(),
      supabase.from("wallet_topups" as any)
        .select("id,amount,status,admin_notes,created_at,payment_method_id,receipt_url,payment_methods(name)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
    ]);
    setBalance(Number((w as any)?.balance || 0));
    setTopups((t as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (user) load(user.id); }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-6 pt-8 pb-12 rounded-b-3xl shadow-[var(--shadow-glow)]">
        <div className="flex items-center justify-between mb-6">
          <Link to="/customer" className="rounded-full p-2 bg-white/15 hover:bg-white/25">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-bold">المحفظة</h1>
          <div className="w-8" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Wallet className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs opacity-80">رصيدك الحالي</p>
            <p className="font-display text-3xl font-bold">{balance.toLocaleString("ar-EG")} <span className="text-sm font-normal opacity-80">ر.ي</span></p>
          </div>
        </div>
      </header>

      <main className="px-5 -mt-6 space-y-4">
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4 flex items-center gap-3 hover:bg-muted/40 transition"
        >
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-right">
            <p className="font-bold">تعبئة الرصيد</p>
            <p className="text-xs text-muted-foreground">حوّل المبلغ ثم أرسل الإيصال للمراجعة</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-180" />
        </button>

        <div className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
          <h2 className="font-display font-bold text-lg mb-3">سجل التعبئات</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">جاري التحميل…</p>
          ) : topups.length === 0 ? (
            <div className="py-10 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">لا توجد طلبات تعبئة بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topups.map((t) => {
                const s = STATUS[t.status];
                return (
                  <div key={t.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm">{Number(t.amount).toLocaleString("ar-EG")} ر.ي</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.payment_methods?.name || "—"} · {new Date(t.created_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
                        <s.Icon className="h-3 w-3" /> {s.text}
                      </span>
                    </div>
                    {t.admin_notes && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                        ملاحظة الإدارة: {t.admin_notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showForm && user && (
        <TopupModal
          userId={user.id}
          onClose={() => setShowForm(false)}
          onDone={() => { setShowForm(false); load(user.id); }}
        />
      )}
    </div>
  );
}

function TopupModal({ userId, onClose, onDone }: { userId: string; onClose: () => void; onDone: () => void }) {
  const [methods, setMethods] = useState<PM[]>([]);
  const [methodId, setMethodId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("payment_methods" as any).select("*").eq("is_active", true).order("created_at")
      .then(({ data }) => setMethods((data as any) || []));
  }, []);

  const selected = methods.find((m) => m.id === methodId);

  const onUpload = async (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) { setError("حجم الصورة يجب أن لا يتجاوز 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("wallet-receipts").upload(path, file, { upsert: false });
    if (upErr) { setError("فشل رفع الإيصال: " + upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("wallet-receipts").getPublicUrl(path);
    setReceiptUrl(pub.publicUrl);
    setUploading(false);
  };

  const submit = async () => {
    setError(null);
    const amt = Number(amount);
    if (!methodId) { setError("اختر طريقة الدفع"); return; }
    if (!amt || amt <= 0) { setError("المبلغ يجب أن يكون أكبر من صفر"); return; }
    if (amt > 10_000_000) { setError("المبلغ كبير جداً"); return; }
    if (!receiptUrl) { setError("صورة الإيصال مطلوبة"); return; }

    setSubmitting(true);
    const { error: insErr } = await supabase.from("wallet_topups" as any).insert({
      user_id: userId,
      payment_method_id: methodId,
      amount: amt,
      receipt_url: receiptUrl,
      sender_name: senderName.trim() || null,
      sender_phone: senderPhone.trim() || null,
      transfer_reference: reference.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (insErr) { setError("فشل إرسال الطلب: " + insErr.message); return; }
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-display font-bold">تعبئة الرصيد</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">طريقة الدفع *</label>
            {methods.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">لا توجد طرق دفع متاحة حالياً. تواصل مع الإدارة.</p>
            ) : (
              <div className="grid gap-2">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethodId(m.id)}
                    className={`text-right rounded-xl border-2 p-3 flex items-center gap-3 transition ${methodId === m.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <CreditCard className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{TYPE_LABELS[m.type]}{m.provider_name ? ` · ${m.provider_name}` : ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2 text-sm">
              <p className="font-semibold text-primary">تفاصيل التحويل</p>
              {selected.account_holder_name && <p><span className="text-muted-foreground">صاحب الحساب:</span> {selected.account_holder_name}</p>}
              {selected.account_number && <p><span className="text-muted-foreground">رقم الحساب:</span> <span className="font-mono">{selected.account_number}</span></p>}
              {selected.phone_number && <p><span className="text-muted-foreground">رقم الهاتف:</span> <span className="font-mono">{selected.phone_number}</span></p>}
              {selected.instructions && <p className="text-xs whitespace-pre-wrap text-muted-foreground bg-white/60 rounded p-2">{selected.instructions}</p>}
              {selected.qr_code_url && (
                <div className="flex justify-center pt-2">
                  <img src={selected.qr_code_url} alt="QR" className="h-32 w-32 rounded-lg object-contain border border-border bg-white" />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">المبلغ (ر.ي) *</label>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="مثال: 10000"
              className="w-full rounded-xl border-2 border-input px-4 py-2.5 focus:border-primary focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">اسم المرسل</label>
              <input value={senderName} onChange={(e) => setSenderName(e.target.value)} maxLength={100}
                className="w-full rounded-xl border-2 border-input px-3 py-2.5 focus:border-primary focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">هاتف المرسل</label>
              <input value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} maxLength={20}
                className="w-full rounded-xl border-2 border-input px-3 py-2.5 focus:border-primary focus:outline-none text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">رقم العملية / المرجع</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100}
              className="w-full rounded-xl border-2 border-input px-4 py-2.5 focus:border-primary focus:outline-none text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">صورة إيصال التحويل *</label>
            <div className="flex items-center gap-3">
              {receiptUrl && <img src={receiptUrl} alt="receipt" className="h-20 w-20 rounded-lg object-cover border border-border" />}
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary text-sm">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {receiptUrl ? "استبدال الصورة" : "رفع الإيصال"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
        </div>

        <div className="p-5 border-t border-border flex gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-border font-semibold">إلغاء</button>
          <button onClick={submit} disabled={submitting || uploading}
            className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} إرسال الطلب
          </button>
        </div>
      </div>
    </div>
  );
}
