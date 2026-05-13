import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, MapPin, Loader2, Droplets, Crosshair } from "lucide-react";

export const Route = createFileRoute("/customer/order")({
  component: NewOrder,
});

const WATER_TYPES = [
  { id: "sweet", name: "ماء حلو", desc: "للشرب والطبخ" },
  { id: "desalinated", name: "ماء محلاة", desc: "محلاة من المحطات" },
  { id: "well", name: "ماء آبار", desc: "للاستخدام العام" },
];

function NewOrder() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [pricing, setPricing] = useState<{ city: string; capacity: number; price: number }[]>([]);
  const [city, setCity] = useState("");
  const [capacity, setCapacity] = useState<number>(5000);
  const [waterType, setWaterType] = useState("sweet");
  const [addressTitle, setAddressTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav({ to: "/customer/login" }); return; }
      setUser(data.session.user);
      const { data: prof } = await supabase.from("profiles")
        .select("city").eq("id", data.session.user.id).maybeSingle();
      if (!prof?.city) { nav({ to: "/customer/profile/complete" }); return; }
    });
  }, [nav]);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("cities").select("id,name").eq("is_active", true).order("name"),
        supabase.from("pricing").select("city,capacity,price"),
      ]);
      setCities(c || []);
      setPricing(p || []);
      if (c && c.length && !city) setCity(c[0].name);
    })();
  }, []);

  const capacities = Array.from(new Set(pricing.filter(p => p.city === city).map(p => p.capacity))).sort((a, b) => a - b);
  const price = pricing.find(p => p.city === city && p.capacity === capacity)?.price ?? 0;

  const useGeo = () => {
    if (!navigator.geolocation) return setError("المتصفح لا يدعم تحديد الموقع");
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("تعذّر تحديد الموقع. تأكد من السماح بالوصول."),
    );
  };

  const submit = async () => {
    setError("");
    if (!user) return;
    if (!addressTitle.trim()) return setError("ادخل اسم العنوان (مثل: المنزل)");
    if (!coords) return setError("حدّد موقعك على الخريطة أو استخدم تحديد الموقع");
    if (price === 0) return setError("لا يوجد سعر متاح لهذا الحجم في هذه المدينة");
    setSubmitting(true);
    try {
      // Save address
      const { data: addr, error: addrErr } = await supabase.from("addresses").insert({
        user_id: user.id,
        title: addressTitle,
        city,
        lat: coords.lat,
        lng: coords.lng,
        description: description || null,
      }).select().single();
      if (addrErr) throw addrErr;

      const { data: order, error: ordErr } = await supabase.from("orders").insert({
        customer_id: user.id,
        city,
        address_id: addr.id,
        address_snapshot: { title: addressTitle, description, lat: coords.lat, lng: coords.lng },
        water_type: waterType as any,
        capacity,
        quantity: 1,
        price,
        payment_method: "cash" as any,
        notes: notes || null,
      }).select().single();
      if (ordErr) throw ordErr;

      nav({ to: "/customer/orders/$id", params: { id: order.id } });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="px-5 py-4 flex items-center gap-3 bg-card border-b border-border sticky top-0 z-10">
        <Link to="/customer" className="rounded-full p-2 hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </Link>
        <h1 className="font-display font-bold text-lg">طلب وايت ماء جديد</h1>
      </header>

      <main className="px-5 py-6 space-y-6 max-w-md mx-auto">
        {/* City */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">المدينة</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 font-medium focus:border-primary focus:outline-none"
          >
            {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </section>

        {/* Capacity */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">حجم الوايت</label>
          <div className="grid grid-cols-2 gap-2">
            {capacities.map(c => {
              const p = pricing.find(x => x.city === city && x.capacity === c)?.price ?? 0;
              const sel = capacity === c;
              return (
                <button
                  key={c}
                  onClick={() => setCapacity(c)}
                  className={`rounded-xl p-3 text-right border-2 transition ${sel ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                >
                  <div className="font-bold">{c.toLocaleString("ar-EG")} لتر</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.toLocaleString("ar-EG")} ر.ي</div>
                </button>
              );
            })}
          </div>
          {capacities.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">لا توجد أسعار متاحة لهذه المدينة بعد.</p>
          )}
        </section>

        {/* Water type */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">نوع الماء</label>
          <div className="grid gap-2">
            {WATER_TYPES.map(w => {
              const sel = waterType === w.id;
              return (
                <button key={w.id} onClick={() => setWaterType(w.id)}
                  className={`flex items-center gap-3 rounded-xl p-3 text-right border-2 ${sel ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <Droplets className={`h-5 w-5 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Address */}
        <section className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground block">عنوان التسليم</label>
          <input
            value={addressTitle}
            onChange={(e) => setAddressTitle(e.target.value)}
            placeholder="مثال: المنزل، المكتب"
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="وصف تفصيلي (الحي، علامة مميزة)"
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none resize-none"
          />
          <button
            onClick={useGeo}
            className="w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary"
          >
            <Crosshair className="h-4 w-4" />
            {coords ? `موقعك محدد (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : "تحديد موقعي تلقائياً"}
          </button>
          {coords && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}&zoom=16`}
              target="_blank" rel="noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1"
            >
              <MapPin className="h-3 w-3" /> عرض على الخريطة
            </a>
          )}
        </section>

        {/* Notes */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">ملاحظات (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="أي تعليمات للسائق"
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none resize-none"
          />
        </section>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">الإجمالي • نقداً عند الاستلام</p>
            <p className="font-display font-bold text-xl">{price.toLocaleString("ar-EG")} ر.ي</p>
          </div>
          <button
            onClick={submit}
            disabled={submitting || price === 0}
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            تأكيد الطلب
          </button>
        </div>
      </div>
    </div>
  );
}
