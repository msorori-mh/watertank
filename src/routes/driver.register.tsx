import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/driver/register")({
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

  const submit = async () => {
    setError("");
    if (!name.trim() || !phone.trim() || !plate.trim() || !city) {
      setError("جميع الحقول مطلوبة");
      return;
    }
    setLoading(true);
    const { error: e } = await supabase.from("drivers").insert({
      user_id: user.id,
      name, phone, city, vehicle_plate: plate, vehicle_capacity: capacity,
    });
    setLoading(false);
    if (e) { setError(e.message); return; }
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
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">المدينة</label>
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
