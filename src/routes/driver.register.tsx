import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { driverRouteGuard } from "@/lib/route-guards";
import { Truck, Loader2, Crosshair, MapPin } from "lucide-react";

export const Route = createFileRoute("/driver/register")({
  ...driverRouteGuard,
  component: DriverRegister,
});

function DriverRegister() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<{ name: string }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState(5000);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav({ to: "/driver/login" }); return; }
      setUser(data.session.user);
      const { data: prof } = await supabase.from("profiles").select("phone,name").eq("id", data.session.user.id).maybeSingle();
      if (prof?.phone) setPhone(prof.phone);
      if (prof?.name) setName(prof.name);
      const { data: c } = await supabase.from("cities").select("name").eq("is_active", true).order("name");
      setCities(c || []);
      if (c?.length) setCity(c[0].name);
    });
  }, [nav]);


  const useGeo = () => {
    setError("");
    if (!navigator.geolocation) return setError("الجهاز لا يدعم تحديد الموقع");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("تعذّر تحديد الموقع. فعّل GPS واسمح للتطبيق بالوصول.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const submit = async () => {
    setError("");
    // MVP-FIELD-PILOT-01: explicit per-field validation for the vehicle data.
    if (!name.trim()) return setError("الاسم الكامل مطلوب");
    if (!phone.trim()) return setError("رقم الهاتف مطلوب");
    if (!city) return setError("اختر المدينة / منطقة العمل");
    if (!plate.trim()) return setError("رقم لوحة المركبة مطلوب");
    if (!capacity || capacity <= 0) return setError("اختر سعة الوايت باللتر");
    if (!coords) return setError("حدد موقع تمركز الوايت على الخريطة");
    setLoading(true);
    const { error: profileError } = await supabase.from("profiles").update({
      name: name.trim(), phone: phone.trim(), city, lat: coords.lat, lng: coords.lng,
    } as any).eq("id", user.id);
    if (profileError) { setLoading(false); setError(profileError.message); return; }
    const { error: e } = await supabase.from("drivers").insert({
      user_id: user.id,
      name, phone, city, vehicle_plate: plate, vehicle_capacity: capacity,
    });
    if (e) { setLoading(false); setError(e.message); return; }
    await supabase.rpc("assign_initial_role", { _role: "driver" });
    setLoading(false);
    nav({ to: "/driver" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-[#1a5276] text-white px-5 pt-8 pb-10 rounded-b-3xl">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 mb-3">
          <Truck className="h-7 w-7" />
        </div>
        <h1 className="font-display font-bold text-2xl">تسجيل سائق جديد</h1>
        <p className="text-sm opacity-80 mt-1">سيراجع المدير طلبك ويوافق عليه قبل بدء العمل</p>
      </header>

      <main className="px-5 -mt-6 pb-10 max-w-md mx-auto w-full">
        <div className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">الاسم الكامل</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border-2 border-input px-4 py-3 focus:border-[#1a5276] focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">رقم الهاتف</label>
            <input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border-2 border-input px-4 py-3 focus:border-[#1a5276] focus:outline-none" />
          </div>

          {/* MVP-FIELD-PILOT-01: vehicle data section + approval gate notice */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs font-bold text-amber-800">بيانات الوايت مطلوبة لاعتماد الحساب</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              بعد الإرسال ستكون حالتك «بانتظار موافقة الإدارة»، ولن تستقبل أي طلبات قبل الاعتماد.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">المدينة / منطقة العمل</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border-2 border-input px-4 py-3 focus:border-[#1a5276] focus:outline-none">
              {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">رقم لوحة المركبة</label>
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="مثال: م ر ب ٤٢٧"
              className="w-full rounded-xl border-2 border-input px-4 py-3 focus:border-[#1a5276] focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">سعة الوايت (لتر)</label>
            <select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full rounded-xl border-2 border-input px-4 py-3 focus:border-[#1a5276] focus:outline-none">
              {[1000, 3000, 5000, 10000].map(c => <option key={c} value={c}>{c.toLocaleString("ar-EG")} لتر</option>)}
            </select>
          </div>
          <div className="rounded-xl border-2 border-dashed border-[#1a5276]/30 p-3 space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">موقع تمركز الوايت</label>
            <button type="button" onClick={useGeo} disabled={locating}
              className="w-full rounded-xl bg-[#1a5276]/10 px-4 py-3 text-sm font-semibold text-[#1a5276] flex items-center justify-center gap-2 disabled:opacity-50">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              {coords ? "إعادة تحديد الموقع" : "تحديد موقعي الحالي على الخريطة"}
            </button>
            {coords && (
              <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-emerald-700 underline">
                <MapPin className="h-3 w-3" /> معاينة الموقع المحدد
              </a>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button onClick={submit} disabled={loading}
            className="w-full mt-2 rounded-xl bg-[#1a5276] py-4 font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            إرسال طلب التسجيل
          </button>
        </div>
      </main>
    </div>
  );
}
