import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { Loader2, Wallet, Banknote, Truck, AlertCircle, HandCoins, Percent } from "lucide-react";

export const Route = createFileRoute("/admin/finance")({
  component: AdminFinance,
});

function AdminFinance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, { amount: string; notes: string; open: boolean }>>({});

  const load = async () => {
    const [{ data: orders }, { data: drivers }, { data: handovers }] = await Promise.all([
      supabase.from("orders").select("id,price,app_commission,commission_status,status,payment_status,payment_method,payment_collected_at,driver_id,city,created_at,driver_payout_amount,driver_payout_status,wallet_paid_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("drivers").select("id,name,balance,phone"),
      supabase.from("cash_handovers").select("id,driver_id,amount,received_by,notes,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    const receiverIds = Array.from(new Set((handovers || []).map((h: any) => h.received_by).filter(Boolean)));
    let receivers: Record<string, string> = {};
    if (receiverIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,name,email").in("id", receiverIds);
      receivers = Object.fromEntries((profs || []).map((p: any) => [p.id, p.name || p.email || p.id.slice(0, 8)]));
    }
    setData({ orders: orders || [], drivers: drivers || [], handovers: handovers || [], receivers });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading || !data) return <AdminShell title="المالية والتحصيل"><div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div></AdminShell>;

  const cashOrders = data.orders.filter((o: any) => o.payment_method === "cash");
  const walletOrders = data.orders.filter((o: any) => o.payment_method === "wallet");

  // ==== Cash ====
  const cashCollected = cashOrders.filter((o: any) => o.payment_status === "paid");
  const cashTotalCollected = cashCollected.reduce((a: number, o: any) => a + Number(o.price), 0);
  const cashCommissionsDue = cashOrders
    .filter((o: any) => Number(o.app_commission || 0) > 0)
    .reduce((a: number, o: any) => a + Number(o.app_commission), 0);
  const cashCommissionsUnpaid = cashOrders
    .filter((o: any) => o.commission_status === "unpaid" && Number(o.app_commission || 0) > 0)
    .reduce((a: number, o: any) => a + Number(o.app_commission), 0);
  const totalHandovers = data.handovers.reduce((a: number, h: any) => a + Number(h.amount || 0), 0);

  // ==== Wallet ====
  const walletPaidTotal = walletOrders
    .filter((o: any) => !["pending","rejected","cancelled"].includes(o.status))
    .reduce((a: number, o: any) => a + Number(o.price), 0);
  const walletCommissionsCollected = walletOrders
    .filter((o: any) => o.commission_status === "collected")
    .reduce((a: number, o: any) => a + Number(o.app_commission || 0), 0);
  const walletDriverPayoutsTotal = walletOrders
    .reduce((a: number, o: any) => a + Number(o.driver_payout_amount || 0), 0);
  const walletDriverPayoutsAvailable = walletOrders
    .filter((o: any) => o.driver_payout_status === "available")
    .reduce((a: number, o: any) => a + Number(o.driver_payout_amount || 0), 0);
  const walletDriverPayoutsPending = walletOrders
    .filter((o: any) => o.driver_payout_status === "pending")
    .reduce((a: number, o: any) => a + Number(o.driver_payout_amount || 0), 0);

  const driverBalances = data.drivers.reduce((a: number, d: any) => a + Number(d.balance || 0), 0);

  const driverNameById: Record<string, string> = Object.fromEntries(data.drivers.map((d: any) => [d.id, d.name]));

  const submitHandover = async (driver: any) => {
    const f = form[driver.id] || { amount: "", notes: "", open: false };
    const amount = Number(f.amount);
    if (!amount || amount <= 0) { alert("المبلغ يجب أن يكون أكبر من صفر"); return; }
    if (amount > Number(driver.balance || 0)) { alert("المبلغ أكبر من العمولات المستحقة على السائق"); return; }
    if (!confirm(`تأكيد تسديد ${amount.toLocaleString("ar-EG")} ر.ي عمولة من ${driver.name}؟`)) return;
    setSubmitting(driver.id);
    const { error } = await supabase.rpc("record_cash_handover", {
      _driver_id: driver.id,
      _amount: amount,
      _notes: f.notes || undefined,
    });
    setSubmitting(null);
    if (error) { alert("تعذر تسجيل التسديد: " + error.message); return; }
    setForm((s) => ({ ...s, [driver.id]: { amount: "", notes: "", open: false } }));
    load();
  };

  const cashCards = [
    { label: "إجمالي قيمة الطلبات النقدية", value: cashTotalCollected, icon: Wallet, color: "bg-primary/10 text-primary" },
    { label: "عمولات على السائقين", value: cashCommissionsDue, icon: Percent, color: "bg-emerald-50 text-emerald-700" },
    { label: "غير مسدد من العمولات", value: cashCommissionsUnpaid, icon: AlertCircle, color: "bg-rose-50 text-rose-700" },
    { label: "أرصدة العمولة على السائقين", value: driverBalances, icon: Truck, color: "bg-blue-50 text-blue-700" },
    { label: "إجمالي عمولات مسددة", value: totalHandovers, icon: HandCoins, color: "bg-violet-50 text-violet-700" },
  ];

  const walletCards = [
    { label: "إجمالي مدفوعات المحفظة", value: walletPaidTotal, icon: Wallet, color: "bg-primary/10 text-primary" },
    { label: "عمولات التطبيق المحصّلة", value: walletCommissionsCollected, icon: Percent, color: "bg-emerald-50 text-emerald-700" },
    { label: "مستحقات السائقين (إجمالي)", value: walletDriverPayoutsTotal, icon: Truck, color: "bg-blue-50 text-blue-700" },
    { label: "متاح للسحب", value: walletDriverPayoutsAvailable, icon: HandCoins, color: "bg-emerald-50 text-emerald-700" },
    { label: "معلّق (قيد التنفيذ)", value: walletDriverPayoutsPending, icon: Banknote, color: "bg-amber-50 text-amber-700" },
  ];

  const SectionCards = ({ title, cards }: { title: string; cards: typeof cashCards }) => (
    <div className="mb-8">
      <h2 className="font-display font-bold text-lg mb-3">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-2xl p-5 shadow-[var(--shadow-soft)]">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.color} mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-display font-bold text-xl mt-1">{c.value.toLocaleString("ar-EG")} <span className="text-xs">ر.ي</span></p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <AdminShell title="المالية والتحصيل">
      <SectionCards title="أولاً: الطلبات النقدية" cards={cashCards} />
      <SectionCards title="ثانياً: طلبات المحفظة" cards={walletCards} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-bold">عمولات التطبيق المستحقة على السائقين</h2>
            <span className="text-xs text-muted-foreground">عمولة فقط — لا تشمل قيمة الطلبات</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">السائق</th>
                <th className="text-right p-3">الهاتف</th>
                <th className="text-right p-3">عمولات مستحقة</th>
                <th className="text-right p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data.drivers.map((d: any) => {
                const f = form[d.id] || { amount: "", notes: "", open: false };
                return (
                  <>
                    <tr key={d.id} className="border-t border-border">
                      <td className="p-3 font-medium">{d.name}</td>
                      <td className="p-3" dir="ltr">{d.phone}</td>
                      <td className="p-3 font-semibold">{Number(d.balance || 0).toLocaleString("ar-EG")} ر.ي</td>
                      <td className="p-3">
                        {Number(d.balance || 0) > 0 ? (
                          <button onClick={() => setForm((s) => ({ ...s, [d.id]: { ...f, open: !f.open } }))}
                            className="rounded-lg bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-semibold hover:bg-emerald-200">
                            {f.open ? "إخفاء" : "تسديد عمولة التطبيق"}
                          </button>
                        ) : <span className="text-xs text-muted-foreground">لا توجد عمولات</span>}
                      </td>
                    </tr>
                    {f.open && (
                      <tr key={d.id + "-form"} className="bg-slate-50/60">
                        <td colSpan={4} className="p-3">
                          <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
                            <input
                              type="number"
                              min={1}
                              max={Number(d.balance || 0)}
                              placeholder={`المبلغ (حتى ${Number(d.balance).toLocaleString("ar-EG")})`}
                              value={f.amount}
                              onChange={(e) => setForm((s) => ({ ...s, [d.id]: { ...f, amount: e.target.value } }))}
                              className="rounded-lg border border-border px-3 py-2 text-sm flex-1"
                            />
                            <input
                              type="text"
                              placeholder="ملاحظات (اختياري)"
                              value={f.notes}
                              onChange={(e) => setForm((s) => ({ ...s, [d.id]: { ...f, notes: e.target.value } }))}
                              className="rounded-lg border border-border px-3 py-2 text-sm flex-1"
                            />
                            <button
                              disabled={submitting === d.id}
                              onClick={() => submitHandover(d)}
                              className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold disabled:opacity-60"
                            >
                              {submitting === d.id ? "..." : "تأكيد التسديد"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-bold">سجل تسديد العمولات</h2>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-right p-3">السائق</th>
                  <th className="text-right p-3">المبلغ</th>
                  <th className="text-right p-3">المستلم</th>
                  <th className="text-right p-3">التاريخ</th>
                  <th className="text-right p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {data.handovers.map((h: any) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="p-3 font-medium">{driverNameById[h.driver_id] || "—"}</td>
                    <td className="p-3 font-semibold">{Number(h.amount).toLocaleString("ar-EG")} ر.ي</td>
                    <td className="p-3 text-xs">{data.receivers[h.received_by] || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("ar-EG")}</td>
                    <td className="p-3 text-xs">{h.notes || "—"}</td>
                  </tr>
                ))}
                {data.handovers.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">لا توجد تسديدات بعد</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
