import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Wallet, ClipboardList, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { customerRouteGuard } from "@/lib/route-guards";

export const Route = createFileRoute("/customer/reports")({
  ...customerRouteGuard,
  component: CustomerReports,
});

function CustomerReports() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav({ to: "/customer/login" }); return; }
      const uid = session.user.id;
      const [{ data: orders }, { data: wallet }, { data: tx }, { data: topups }] = await Promise.all([
        supabase.from("orders").select("id,city,capacity,water_type,status,price,payment_method,created_at")
          .eq("customer_id", uid).order("created_at", { ascending: false }).limit(200),
        supabase.from("wallets").select("balance").eq("user_id", uid).maybeSingle(),
        supabase.from("wallet_transactions").select("id,type,direction,amount,balance_after,description,created_at")
          .eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
        supabase.from("wallet_topups").select("id,amount,status,created_at")
          .eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
      ]);
      setData({ orders: orders || [], wallet, tx: tx || [], topups: topups || [] });
      setLoading(false);
    })();
  }, [nav]);

  if (loading || !data) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" />
      <CustomerBottomNav />
    </div>;

  const orders: any[] = data.orders;
  const completed = orders.filter(o => o.status === "completed");
  const cancelled = orders.filter(o => o.status === "cancelled" || o.status === "rejected");
  const cashPaid = completed.filter(o => o.payment_method === "cash").reduce((a, o) => a + Number(o.price), 0);
  const walletPaid = completed.filter(o => o.payment_method === "wallet").reduce((a, o) => a + Number(o.price), 0);
  const approvedTopups = (data.topups as any[]).filter(t => t.status === "approved");
  const topupTotal = approvedTopups.reduce((a, t) => a + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-5 pt-8 pb-10 rounded-b-3xl">
        <Link to="/customer" className="inline-flex items-center gap-1 text-sm opacity-90"><ArrowRight className="h-4 w-4" /> رجوع</Link>
        <h1 className="font-display text-2xl font-bold mt-3">تقاريري</h1>
        <p className="text-xs opacity-80 mt-1">ملخص طلباتك وحركة محفظتك</p>
      </header>

      <main className="px-5 -mt-6 max-w-md mx-auto space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="إجمالي الطلبات" value={orders.length} icon={ClipboardList} color="text-primary" />
          <Stat label="مكتملة" value={completed.length} icon={CheckCircle2} color="text-emerald-600" />
          <Stat label="ملغية/مرفوضة" value={cancelled.length} icon={XCircle} color="text-rose-600" />
          <Stat label="رصيد المحفظة" value={`${Number(data.wallet?.balance || 0).toLocaleString("ar-EG")} ر.ي`} icon={Wallet} color="text-primary" />
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)] space-y-2 text-sm">
          <Row label="إجمالي ما دفعته نقداً" value={`${cashPaid.toLocaleString("ar-EG")} ر.ي`} />
          <Row label="إجمالي ما دفعته من المحفظة" value={`${walletPaid.toLocaleString("ar-EG")} ر.ي`} />
          <Row label="إجمالي التعبئات المعتمدة" value={`${topupTotal.toLocaleString("ar-EG")} ر.ي (${approvedTopups.length})`} />
        </div>

        <Section title="آخر الطلبات">
          {orders.length === 0 ? <Empty text="لا توجد طلبات بعد" /> :
            orders.slice(0, 10).map(o => (
              <Link key={o.id} to="/customer/orders/$id" params={{ id: o.id }} className="block rounded-xl border border-border p-3 text-sm hover:bg-muted/40">
                <div className="flex justify-between">
                  <span className="font-bold">وايت {o.capacity.toLocaleString("ar-EG")} لتر</span>
                  <span className="font-bold">{Number(o.price).toLocaleString("ar-EG")} ر.ي</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{o.city} • {new Date(o.created_at).toLocaleDateString("ar-EG")} • {statusLabel(o.status)} • {o.payment_method === "wallet" ? "محفظة" : "نقدي"}</p>
              </Link>
            ))
          }
        </Section>

        <Section title="آخر حركات المحفظة">
          {data.tx.length === 0 ? <Empty text="لا توجد حركات بعد" /> :
            data.tx.slice(0, 10).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <div>
                  <p className="font-semibold">{txLabel(t.type)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("ar-EG")}</p>
                </div>
                <p className={`font-bold ${t.direction === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                  {t.direction === "credit" ? "+" : "-"}{Number(t.amount).toLocaleString("ar-EG")} ر.ي
                </p>
              </div>
            ))
          }
        </Section>
      </main>
    </div>
  );
}

function statusLabel(s: string) {
  return ({ pending: "قيد المراجعة", approved: "معتمد", accepted: "مقبول", on_the_way: "في الطريق", arrived: "وصل", delivering: "يصب", payment_collected: "تم التحصيل", completed: "مكتمل", cancelled: "ملغى", rejected: "مرفوض" } as any)[s] || s;
}
function txLabel(t: string) {
  return ({ topup: "تعبئة محفظة", order_payment: "دفع طلب", refund: "استرداد" } as any)[t] || t;
}

function Stat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><p className="text-xs text-muted-foreground">{label}</p></div>
      <p className="font-display font-bold text-lg mt-1">{value}</p>
    </div>
  );
}
function Row({ label, value }: any) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-bold">{value}</span></div>;
}
function Section({ title, children }: any) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
      <h2 className="font-display font-bold mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground text-center py-6">{text}</p>;
}
