import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { deferredFeatureGuard } from "@/lib/route-guards";
import { Loader2, CheckCircle2, XCircle, Banknote, Building2, Smartphone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/driver-withdrawals")({
  // MVP-02-CASH-ONLY-SCOPE: deferred feature, redirect before any query runs.
  beforeLoad: deferredFeatureGuard("/admin"),
  component: AdminDriverWithdrawals,
});

const STATUSES = ["pending", "approved", "rejected", "paid"] as const;
type S = typeof STATUSES[number] | "all";
const LABELS: Record<string, string> = {
  pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض", paid: "مدفوع",
};
const COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-rose-100 text-rose-700",
  paid: "bg-emerald-100 text-emerald-700",
};

function AdminDriverWithdrawals() {
  const [rows, setRows] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<S>("all");
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    const { data: r } = await supabase.from("driver_withdrawal_requests").select("*").order("created_at", { ascending: false });
    const ids = Array.from(new Set((r || []).map((x: any) => x.driver_id)));
    let drv: Record<string, any> = {};
    if (ids.length) {
      const { data: d } = await supabase.from("drivers").select("id,name,phone,payout_type,payout_method,payout_account,payout_recipient_name,bank_name,bank_account_holder,bank_account_number,transfer_recipient_name,transfer_phone,transfer_network_name").in("id", ids);
      drv = Object.fromEntries((d || []).map((x: any) => [x.id, x]));
    }
    setRows(r || []); setDrivers(drv); setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-withdrawals")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_withdrawal_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const act = async (id: string, action: "approve" | "reject" | "pay") => {
    let notes: string | null = null;
    if (action === "reject") {
      notes = prompt("سبب الرفض (اختياري)") || null;
    } else if (action === "pay") {
      if (!confirm("تأكيد تسجيل الدفع؟ سيتم تحويل الطلبات إلى مدفوعة.")) return;
    }
    setActing(id);
    const { error } = await supabase.rpc("process_driver_withdrawal", {
      _request_id: id, _action: action, _admin_notes: notes ?? undefined,
    });
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success("تم");
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter(r => r.status === filter);

  return (
    <AdminShell title="سحوبات السائقين">
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-white border border-border"}`}>
          الكل ({rows.length})
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "bg-white border border-border"}`}>
            {LABELS[s]} ({rows.filter(r => r.status === s).length})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
        ) : (
          <table className="w-full text-sm min-w-[950px]">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">السائق</th>
                <th className="text-right p-3">المبلغ</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">طريقة الاستلام</th>
                <th className="text-right p-3">ملاحظات السائق</th>
                <th className="text-right p-3">ملاحظات الإدارة</th>
                <th className="text-right p-3">التاريخ</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const d = drivers[r.driver_id];
                return (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-3">
                      <p className="font-semibold">{d?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{d?.phone || ""}</p>
                    </td>
                    <td className="p-3 font-bold">{Number(r.amount).toLocaleString("ar-EG")} ر.ي</td>
                    <td className="p-3"><span className={`text-xs rounded-full px-2 py-0.5 ${COLORS[r.status]}`}>{LABELS[r.status]}</span></td>
                    <td className="p-3 text-xs max-w-[240px]"><PayoutDetails d={d} /></td>
                    <td className="p-3 text-xs max-w-[180px] whitespace-pre-wrap">{r.payment_method_notes || "—"}</td>
                    <td className="p-3 text-xs max-w-[180px] whitespace-pre-wrap">{r.admin_notes || "—"}</td>
                    <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString("ar-EG")}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        {r.status === "pending" && (
                          <>
                            <button onClick={() => act(r.id, "approve")} className="rounded-lg bg-blue-100 text-blue-700 px-2 py-1 text-xs font-semibold hover:bg-blue-200">
                              <CheckCircle2 className="h-3 w-3 inline" /> اعتماد
                            </button>
                            <button onClick={() => act(r.id, "reject")} className="rounded-lg bg-rose-100 text-rose-700 px-2 py-1 text-xs font-semibold hover:bg-rose-200">
                              <XCircle className="h-3 w-3 inline" /> رفض
                            </button>
                          </>
                        )}
                        {(r.status === "pending" || r.status === "approved") && (
                          <button onClick={() => act(r.id, "pay")} className="rounded-lg bg-emerald-600 text-white px-2 py-1 text-xs font-semibold hover:bg-emerald-700">
                            <Banknote className="h-3 w-3 inline" /> تم الدفع
                          </button>
                        )}
                        {acting === r.id && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}

function PayoutDetails({ d }: { d: any }) {
  if (!d) return <span className="text-muted-foreground">—</span>;
  const type = d.payout_type || (d.payout_method === "bank" ? "bank" : d.payout_method ? "transfer_network" : null);
  if (type === "bank") {
    const bank = d.bank_name || "—";
    const holder = d.bank_account_holder || d.payout_recipient_name || "—";
    const num = d.bank_account_number || d.payout_account || "—";
    return (
      <div className="space-y-0.5">
        <p className="font-semibold flex items-center gap-1"><Building2 className="h-3 w-3 text-blue-600" /> إيداع بنكي</p>
        <p><span className="text-muted-foreground">البنك:</span> {bank}</p>
        <p><span className="text-muted-foreground">الحساب:</span> {holder}</p>
        <p className="font-mono"><span className="text-muted-foreground font-sans">رقم:</span> {num}</p>
      </div>
    );
  }
  if (type === "transfer_network") {
    const recipient = d.transfer_recipient_name || d.payout_recipient_name || "—";
    const phone = d.transfer_phone || d.payout_account || "—";
    const network = d.transfer_network_name || "—";
    return (
      <div className="space-y-0.5">
        <p className="font-semibold flex items-center gap-1"><Smartphone className="h-3 w-3 text-emerald-600" /> حوالة شبكة</p>
        <p><span className="text-muted-foreground">المستلم:</span> {recipient}</p>
        <p className="font-mono"><span className="text-muted-foreground font-sans">هاتف:</span> {phone}</p>
        <p><span className="text-muted-foreground">الشبكة:</span> {network}</p>
      </div>
    );
  }
  return <span className="text-muted-foreground">لم تُحدّد</span>;
}
