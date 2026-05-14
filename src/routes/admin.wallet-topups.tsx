import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Loader2, CheckCircle2, XCircle, ExternalLink, Search, X, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/wallet-topups")({
  component: AdminWalletTopups,
});

type Topup = {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  receipt_url: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  transfer_reference: string | null;
  payment_method_id: string | null;
  payment_methods?: { id: string; name: string } | null;
  profiles?: { name: string | null; phone: string | null; email: string | null } | null;
};

type PM = { id: string; name: string };

const STATUS = {
  pending: { text: "قيد المراجعة", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  approved: { text: "معتمد", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  rejected: { text: "مرفوض", cls: "bg-rose-100 text-rose-700", Icon: XCircle },
};

function AdminWalletTopups() {
  const [items, setItems] = useState<Topup[]>([]);
  const [methods, setMethods] = useState<PM[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Topup | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [approving, setApproving] = useState<Topup | null>(null);
  const [approveAmount, setApproveAmount] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // filters
  const [status, setStatus] = useState<string>("pending");
  const [methodId, setMethodId] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wallet_topups" as any)
      .select("*, payment_methods(id,name), profiles!wallet_topups_user_id_fkey(name,phone,email)")
      .order("created_at", { ascending: false });
    // The FK to profiles is implicit; fall back if join fails
    let rows = (data as any) as Topup[] | null;
    if (!rows) {
      const { data: simple } = await supabase
        .from("wallet_topups" as any)
        .select("*, payment_methods(id,name)")
        .order("created_at", { ascending: false });
      rows = (simple as any) || [];
      // hydrate profiles
      const ids = Array.from(new Set((rows || []).map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,name,phone,email").in("id", ids);
        const map = new Map((profs || []).map((p: any) => [p.id, p]));
        rows = (rows || []).map((r) => ({ ...r, profiles: map.get(r.user_id) || null }));
      }
    }
    setItems(rows || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from("payment_methods" as any).select("id,name").then(({ data }) => setMethods((data as any) || []));
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((t) => {
      if (status && t.status !== status) return false;
      if (methodId && t.payment_method_id !== methodId) return false;
      if (from && new Date(t.created_at) < new Date(from)) return false;
      if (to && new Date(t.created_at) > new Date(to + "T23:59:59")) return false;
      if (s) {
        const hay = [
          t.profiles?.name || "",
          t.profiles?.phone || "",
          t.profiles?.email || "",
          t.sender_name || "",
          t.sender_phone || "",
          t.transfer_reference || "",
        ].join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [items, status, methodId, from, to, search]);

  const submitApprove = async () => {
    if (!approving) return;
    const amt = Number(approveAmount);
    if (!amt || amt <= 0) { alert("أدخل مبلغاً صحيحاً"); return; }
    setActing(approving.id);
    const { error } = await supabase.rpc("approve_wallet_topup" as any, {
      _topup_id: approving.id,
      _approved_amount: amt,
    });
    setActing(null);
    if (error) { alert("فشل الاعتماد: " + error.message); return; }
    setApproving(null); setApproveAmount("");
    load();
  };

  const submitReject = async () => {
    if (!rejecting) return;
    setActing(rejecting.id);
    const { error } = await supabase.rpc("reject_wallet_topup" as any, {
      _topup_id: rejecting.id,
      _admin_notes: rejectNotes.trim() || null,
    });
    setActing(null);
    if (error) { alert("فشل الرفض: " + error.message); return; }
    setRejecting(null); setRejectNotes("");
    load();
  };

  const reset = () => { setStatus(""); setMethodId(""); setFrom(""); setTo(""); setSearch(""); };

  return (
    <AdminShell title="تعبئة المحافظ">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-4 mb-5 grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2 relative">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث: اسم/هاتف/مرجع"
            className="w-full rounded-xl border border-input pr-9 pl-3 py-2 text-sm focus:border-primary outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-input px-3 py-2 text-sm">
          <option value="">كل الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="approved">معتمد</option>
          <option value="rejected">مرفوض</option>
        </select>
        <select value={methodId} onChange={(e) => setMethodId(e.target.value)}
          className="rounded-xl border border-input px-3 py-2 text-sm">
          <option value="">كل طرق الدفع</option>
          {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-input px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-xl border border-input px-3 py-2 text-sm" />
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground px-2">مسح</button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-10 text-center text-muted-foreground">
          لا توجد طلبات تطابق الفلاتر.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((t) => {
            const s = STATUS[t.status];
            return (
              <div key={t.id} className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-lg">{Number(t.amount).toLocaleString("ar-EG")} <span className="text-sm font-normal text-muted-foreground">ر.ي</span></p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t.profiles?.name || t.profiles?.email || "عميل"} {t.profiles?.phone && <span className="font-mono">· {t.profiles.phone}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.payment_methods?.name || "—"} · {new Date(t.created_at).toLocaleString("ar-EG")}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
                    <s.Icon className="h-3 w-3" /> {s.text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {t.sender_name && <div><span className="text-muted-foreground">المرسل:</span> {t.sender_name}</div>}
                  {t.sender_phone && <div><span className="text-muted-foreground">هاتف المرسل:</span> <span className="font-mono">{t.sender_phone}</span></div>}
                  {t.transfer_reference && <div className="col-span-2"><span className="text-muted-foreground">مرجع العملية:</span> <span className="font-mono">{t.transfer_reference}</span></div>}
                </div>

                {t.receipt_url && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                    <button onClick={() => setPreviewUrl(t.receipt_url)} className="shrink-0">
                      <img src={t.receipt_url} alt="receipt" className="h-16 w-16 rounded-lg object-cover border border-border" />
                    </button>
                    <a href={t.receipt_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
                      <ExternalLink className="h-3 w-3" /> فتح الإيصال
                    </a>
                  </div>
                )}

                {t.admin_notes && (
                  <p className="mt-3 text-xs bg-muted/60 rounded-lg p-2 text-muted-foreground">
                    <span className="font-semibold">ملاحظة الإدارة:</span> {t.admin_notes}
                  </p>
                )}

                {t.status === "pending" ? (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                    <button onClick={() => { setApproving(t); setApproveAmount(String(t.amount)); }} disabled={acting === t.id}
                      className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                      {acting === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} اعتماد
                    </button>
                    <button onClick={() => { setRejecting(t); setRejectNotes(""); }} disabled={acting === t.id}
                      className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                      <XCircle className="h-4 w-4" /> رفض
                    </button>
                  </div>
                ) : (
                  t.reviewed_at && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      تمت المراجعة في {new Date(t.reviewed_at).toLocaleString("ar-EG")}
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-4 left-4 text-white p-2 bg-white/10 rounded-lg" onClick={() => setPreviewUrl(null)}>
            <X className="h-5 w-5" />
          </button>
          <img src={previewUrl} alt="receipt full" className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg" />
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejecting(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-display font-bold">رفض طلب التعبئة</h2>
              <button onClick={() => setRejecting(null)} className="p-1"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">المبلغ: <span className="font-semibold text-foreground">{Number(rejecting.amount).toLocaleString("ar-EG")} ر.ي</span></p>
              <div>
                <label className="block text-sm font-medium mb-1.5">سبب الرفض (اختياري)</label>
                <textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={3} maxLength={500}
                  placeholder="مثال: الإيصال غير واضح / المبلغ المحوّل لا يطابق الطلب"
                  className="w-full rounded-xl border-2 border-input px-3 py-2 text-sm focus:border-primary outline-none resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={() => setRejecting(null)} className="flex-1 px-4 py-2 rounded-xl border border-border">إلغاء</button>
              <button onClick={submitReject} disabled={acting === rejecting.id}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center justify-center gap-2">
                {acting === rejecting.id && <Loader2 className="h-4 w-4 animate-spin" />} تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
      {approving && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setApproving(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-display font-bold">اعتماد طلب التعبئة</h2>
              <button onClick={() => setApproving(null)} className="p-1"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                المبلغ المطلوب من العميل: <span className="font-semibold text-foreground">{Number(approving.amount).toLocaleString("ar-EG")} ر.ي</span>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5">المبلغ الفعلي للشحن (ر.ي)</label>
                <input type="number" min={1} step="any" value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  className="w-full rounded-xl border-2 border-input px-3 py-2 text-sm focus:border-primary outline-none" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  يمكنك تعديل المبلغ في حال أرسل العميل قيمة مختلفة عن المطلوب.
                </p>
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={() => setApproving(null)} className="flex-1 px-4 py-2 rounded-xl border border-border">إلغاء</button>
              <button onClick={submitApprove} disabled={acting === approving.id}
                className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2">
                {acting === approving.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} تأكيد الاعتماد
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminShell>
  );
}
