import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, MapPin, Loader2, Droplets, Wallet, Banknote, Plus, Star, CheckCircle2 } from "lucide-react";
import { WATER_TYPES } from "@/lib/water-types";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";

export const Route = createFileRoute("/customer/order")({
  component: NewOrder,
});

type Address = {
  id: string; user_id: string; title: string; city: string;
  description: string | null; lat: number; lng: number; is_default: boolean;
};

function NewOrder() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [pricing, setPricing] = useState<{ city: string; capacity: number; price: number }[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string>("");
  const [capacity, setCapacity] = useState<number>(5000);
  const [waterType, setWaterType] = useState("normal");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet">("cash");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { nav({ to: "/customer/login" }); return; }
      setUser(s.session.user);
      const uid = s.session.user.id;
      const [{ data: prof }, { data: w }, { data: c }, { data: p }, { data: a }] = await Promise.all([
        supabase.from("profiles").select("city").eq("id", uid).maybeSingle(),
        supabase.from("wallets").select("balance").eq("user_id", uid).maybeSingle(),
        supabase.from("cities").select("id,name").eq("is_active", true).order("name"),
        supabase.from("pricing").select("city,capacity,price"),
        supabase.from("addresses").select("*").eq("user_id", uid)
          .order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      if (!prof?.city) { nav({ to: "/customer/profile/complete" }); return; }
      setWalletBalance(Number(w?.balance ?? 0));
      setCities(c || []);
      setPricing(p || []);
      const list = (a as any as Address[]) || [];
      setAddresses(list);
      if (list.length) setSelectedAddrId(list[0].id);
      setLoading(false);
    })();
  }, [nav]);

  const selected = addresses.find((x) => x.id === selectedAddrId) || null;
  const city = selected?.city || "";
  const capacities = Array.from(new Set(pricing.filter(p => p.city === city).map(p => p.capacity))).sort((a, b) => a - b);
  const price = pricing.find(p => p.city === city && p.capacity === capacity)?.price ?? 0;

  // ensure capacity is valid for the selected city
  useEffect(() => {
    if (capacities.length && !capacities.includes(capacity)) setCapacity(capacities[0]);
  }, [city]); // eslint-disable-line

  const submit = async () => {
    setError("");
    if (!user) return;
    if (!selected) return setError("اختر عنوان التسليم أولاً");
    if (!selected.lat || !selected.lng) return setError("العنوان لا يحتوي على إحداثيات صالحة");
    if (!cities.find((c) => c.name === selected.city)) return setError("مدينة العنوان غير مفعّلة، عدّل العنوان");
    if (price === 0) return setError("لا يوجد سعر متاح لهذا الحجم في هذه المدينة");
    if (paymentMethod === "wallet" && walletBalance < price) {
      return setError("رصيد المحفظة غير كافٍ، يرجى تعبئة المحفظة.");
    }
    setSubmitting(true);
    try {
      const snapshot = {
        title: selected.title,
        description: selected.description,
        lat: selected.lat,
        lng: selected.lng,
      };

      if (paymentMethod === "wallet") {
        const { data: order, error: rpcErr } = await supabase.rpc("create_wallet_order", {
          _city: selected.city,
          _address_id: selected.id,
          _address_snapshot: snapshot as any,
          _water_type: waterType as any,
          _capacity: capacity,
          _price: price,
          _notes: notes || undefined,
        });
        if (rpcErr) throw rpcErr;
        nav({ to: "/customer/orders/$id", params: { id: (order as any).id } });
      } else {
        const { data: order, error: ordErr } = await supabase.from("orders").insert({
          customer_id: user.id,
          city: selected.city,
          address_id: selected.id,
          address_snapshot: snapshot,
          water_type: waterType as any,
          capacity,
          quantity: 1,
          price,
          payment_method: "cash" as any,
          notes: notes || null,
        }).select().single();
        if (ordErr) throw ordErr;
        nav({ to: "/customer/orders/$id", params: { id: order.id } });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" />
      <CustomerBottomNav />
    </div>;
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="px-5 py-4 flex items-center gap-3 bg-card border-b border-border sticky top-0 z-10">
        <Link to="/customer" className="rounded-full p-2 hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </Link>
        <h1 className="font-display font-bold text-lg">طلب وايت ماء جديد</h1>
      </header>

      <main className="px-5 py-6 space-y-6 max-w-md mx-auto">
        {/* Address selection */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground">عنوان التسليم</label>
            <Link to="/customer/addresses" className="text-xs font-bold text-primary inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> إدارة العناوين
            </Link>
          </div>

          {addresses.length === 0 ? (
            <Link to="/customer/addresses"
              className="block rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 text-center">
              <MapPin className="h-6 w-6 text-primary mx-auto" />
              <p className="mt-2 font-bold text-sm text-deep">لا توجد عناوين محفوظة</p>
              <p className="text-xs text-muted-foreground mt-1">أضف عنواناً واحداً لإكمال الطلب</p>
              <span className="inline-block mt-3 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-bold">
                إضافة عنوان جديد
              </span>
            </Link>
          ) : (
            <div className="space-y-2">
              {addresses.map((a) => {
                const sel = selectedAddrId === a.id;
                return (
                  <button key={a.id} onClick={() => setSelectedAddrId(a.id)}
                    className={`w-full text-right rounded-xl p-3 border-2 transition flex items-start gap-3 ${sel ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${sel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {sel ? <CheckCircle2 className="h-5 w-5" /> : <MapPin className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{a.title}</p>
                        {a.is_default && <Star className="h-3 w-3 text-primary fill-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{a.city}</p>
                      {a.description && <p className="text-xs text-muted-foreground truncate">{a.description}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Capacity */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">حجم الوايت</label>
          {capacities.length === 0 ? (
            <p className="text-xs text-muted-foreground bg-muted rounded-xl p-3">لا توجد أسعار متاحة لمدينة العنوان المختار.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {capacities.map(c => {
                const p = pricing.find(x => x.city === city && x.capacity === c)?.price ?? 0;
                const sel = capacity === c;
                return (
                  <button key={c} onClick={() => setCapacity(c)}
                    className={`rounded-xl p-3 text-right border-2 transition ${sel ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <div className="font-bold">{c.toLocaleString("ar-EG")} لتر</div>
                    <div className="text-xs text-muted-foreground mt-1">{p.toLocaleString("ar-EG")} ر.ي</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Water type */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">نوع الماء</label>
          <div className="grid grid-cols-2 gap-2">
            {WATER_TYPES.map(w => {
              const sel = waterType === w.id;
              return (
                <button key={w.id} onClick={() => setWaterType(w.id)}
                  style={sel ? { borderColor: w.color, background: `${w.color}10` } : undefined}
                  className={`flex flex-col items-center gap-2 rounded-2xl p-4 text-center border-2 transition ${sel ? "" : "border-border bg-card"}`}>
                  <div className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ background: `${w.color}1A` }}>
                    <Droplets className="h-6 w-6" style={{ color: w.color }} />
                  </div>
                  <div className="font-bold text-sm" style={sel ? { color: w.color } : undefined}>{w.name}</div>
                  <div className="text-[11px] text-muted-foreground leading-4">{w.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Payment method */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">طريقة الدفع</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPaymentMethod("cash")}
              className={`rounded-xl p-3 text-right border-2 ${paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-2">
                <Banknote className={`h-5 w-5 ${paymentMethod === "cash" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className="font-bold text-sm">نقداً عند التسليم</div>
                  <div className="text-[11px] text-muted-foreground">ادفع للسائق مباشرة</div>
                </div>
              </div>
            </button>
            <button onClick={() => setPaymentMethod("wallet")}
              className={`rounded-xl p-3 text-right border-2 ${paymentMethod === "wallet" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-2">
                <Wallet className={`h-5 w-5 ${paymentMethod === "wallet" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className="font-bold text-sm">من المحفظة</div>
                  <div className="text-[11px] text-muted-foreground">رصيدك: {walletBalance.toLocaleString("ar-EG")} ر.ي</div>
                </div>
              </div>
            </button>
          </div>
          {paymentMethod === "wallet" && walletBalance < price && price > 0 && (
            <div className="mt-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              <p className="font-semibold">رصيد المحفظة غير كافٍ</p>
              <p className="text-xs mt-1">المطلوب {price.toLocaleString("ar-EG")} ر.ي ورصيدك {walletBalance.toLocaleString("ar-EG")} ر.ي</p>
              <Link to="/customer/wallet" className="inline-block mt-2 rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-bold">
                تعبئة المحفظة
              </Link>
            </div>
          )}
        </section>

        {/* Notes */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">ملاحظات (اختياري)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="أي تعليمات للسائق"
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none resize-none" />
        </section>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">الإجمالي • {paymentMethod === "wallet" ? "خصم من المحفظة" : "نقداً عند الاستلام"}</p>
            <p className="font-display font-bold text-xl">{price.toLocaleString("ar-EG")} ر.ي</p>
          </div>
          <button onClick={submit} disabled={submitting || price === 0 || !selected}
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            تأكيد الطلب
          </button>
        </div>
      </div>
    </div>
  );
}
