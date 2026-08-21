import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, User, MapPin, Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { customerRouteGuard } from "@/lib/route-guards";

export const Route = createFileRoute("/customer/profile/complete")({
  ...customerRouteGuard,
  component: CompleteProfile,
});

function CompleteProfile() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [addrTitle, setAddrTitle] = useState("المنزل");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { nav({ to: "/customer/login" }); return; }
      setUser(s.session.user);
      const [{ data: prof }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", s.session.user.id).maybeSingle(),
        supabase.from("cities").select("id,name").eq("is_active", true).order("name"),
      ]);
      setCities(c || []);
      if (prof) {
        setName(prof.name || "");
        setPhone(prof.phone || "");
        setCity(prof.city || "");
      }
      setLoading(false);
    })();
  }, [nav]);

  const useGeo = () => {
    if (!navigator.geolocation) return setError("المتصفح لا يدعم تحديد الموقع");
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("تعذّر تحديد الموقع. تأكد من السماح بالوصول."),
    );
  };

  const save = async () => {
    setError("");
    if (!name.trim()) return setError("ادخل اسمك");
    if (!phone.trim()) return setError("ادخل رقم الهاتف");
    if (!city) return setError("اختر المدينة");
    if (!addrTitle.trim()) return setError("اكتب اسم العنوان");
    if (!description.trim()) return setError("اكتب وصف العنوان");
    if (!coords) return setError("حدد موقعك قبل المتابعة");
    setSaving(true);
    try {
      const { error: pErr } = await supabase.from("profiles").update({
        name: name.trim(),
        phone: phone.trim(),
        city,
        lat: coords.lat,
        lng: coords.lng,
      } as any).eq("id", user.id);
      if (pErr) throw pErr;

      const { error: addressError } = await supabase.from("addresses").insert({
          user_id: user.id,
          title: addrTitle.trim(),
          city,
          description: description.trim(),
          lat: coords.lat,
          lng: coords.lng,
          is_default: true,
        });
      if (addressError) throw addressError;
      nav({ to: "/customer" });
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-4">
        <h1 className="font-display font-bold text-lg">إكمال بياناتك</h1>
        <p className="text-xs text-muted-foreground">نحتاج بعض المعلومات قبل أول طلب</p>
      </header>

      <main className="flex-1 px-6 max-w-md mx-auto w-full space-y-4 pb-10">
        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
            <User className="h-3 w-3" /> الاسم
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">رقم الهاتف</label>
          <input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+967 7XX XXX XXX"
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
            <MapPin className="h-3 w-3" /> المدينة
          </label>
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none">
            <option value="">اختر المدينة</option>
            {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">موقع التوصيل الأساسي</p>
          <input value={addrTitle} onChange={(e) => setAddrTitle(e.target.value)}
            placeholder="مثل: المنزل"
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="الحي، الشارع، وأقرب علامة مميزة"
            rows={3}
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none resize-none" />
          <button type="button" onClick={useGeo}
            className="w-full rounded-xl bg-muted px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2">
            <Crosshair className="h-4 w-4" />
            {coords ? `تم التحديد (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})` : "حدد موقعي الحالي على الخريطة"}
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button onClick={save} disabled={saving}
          className="w-full rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ ومتابعة
        </button>
      </main>
    </div>
  );
}
