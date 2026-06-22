import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight, MapPin, Loader2, Crosshair, Plus, Trash2, Pencil,
  Star, Home, Briefcase, Sprout, MapPinned, X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { customerRouteGuard } from "@/lib/route-guards";

export const Route = createFileRoute("/customer/addresses")({
  ...customerRouteGuard,
  component: AddressesPage,
});

type Address = {
  id: string;
  user_id: string;
  title: string;
  city: string;
  description: string | null;
  lat: number;
  lng: number;
  is_default: boolean;
  created_at: string;
};

const PRESETS = [
  { id: "home", label: "المنزل", icon: Home },
  { id: "work", label: "العمل", icon: Briefcase },
  { id: "farm", label: "المزرعة", icon: Sprout },
  { id: "other", label: "أخرى", icon: MapPinned },
];

function AddressesPage() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { nav({ to: "/customer/login" }); return; }
      setUser(s.session.user);
      await refresh(s.session.user.id);
      const { data: c } = await supabase.from("cities").select("id,name").eq("is_active", true).order("name");
      setCities(c || []);
      setLoading(false);
    })();
  }, [nav]);

  async function refresh(uid: string) {
    const { data } = await supabase.from("addresses").select("*")
      .eq("user_id", uid).order("is_default", { ascending: false }).order("created_at", { ascending: false });
    setAddresses((data as any) || []);
  }

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false } as any).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true } as any).eq("id", id);
    await refresh(user.id);
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا العنوان؟")) return;
    await supabase.from("addresses").delete().eq("id", id);
    if (user) await refresh(user.id);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="px-5 py-4 flex items-center gap-3 bg-card border-b border-border sticky top-0 z-10">
        <Link to="/customer" className="rounded-full p-2 hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </Link>
        <h1 className="font-display font-bold text-lg flex-1">عناويني</h1>
        <button onClick={() => setEditing("new")}
          className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-bold flex items-center gap-1">
          <Plus className="h-4 w-4" /> إضافة
        </button>
      </header>

      <main className="px-5 py-6 max-w-md mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : addresses.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="لا توجد عناوين محفوظة"
            description="أضف عنواناً واحداً على الأقل لإنشاء طلبات أسرع"
            action={
              <button onClick={() => setEditing("new")}
                className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> إضافة عنوان
              </button>
            }
          />
        ) : (
          addresses.map((a) => (
            <div key={a.id} className="rounded-2xl bg-card border-2 border-border p-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-deep">{a.title}</p>
                    {a.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                        <Star className="h-3 w-3 fill-current" /> افتراضي
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.city}</p>
                  {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">{a.lat.toFixed(5)}, {a.lng.toFixed(5)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {!a.is_default && (
                  <button onClick={() => setDefault(a.id)}
                    className="rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1">
                    <Star className="h-3 w-3" /> تعيين افتراضي
                  </button>
                )}
                <button onClick={() => setEditing(a)}
                  className="rounded-lg bg-muted text-deep px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1">
                  <Pencil className="h-3 w-3" /> تعديل
                </button>
                <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer"
                  className="rounded-lg bg-muted text-deep px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> الخريطة
                </a>
                <button onClick={() => remove(a.id)}
                  className="rounded-lg bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 mr-auto">
                  <Trash2 className="h-3 w-3" /> حذف
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {editing && user && (
        <AddressEditor
          cities={cities}
          existing={editing === "new" ? null : editing}
          userId={user.id}
          firstAddress={addresses.length === 0}
          onClose={() => setEditing(null)}
          onSaved={async () => { await refresh(user.id); setEditing(null); }}
        />
      )}
    
      <CustomerBottomNav />
    </div>
  );
}

function AddressEditor({
  cities, existing, userId, firstAddress, onClose, onSaved,
}: {
  cities: { id: string; name: string }[];
  existing: Address | null;
  userId: string;
  firstAddress: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(existing?.title || "");
  const [city, setCity] = useState(existing?.city || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    existing ? { lat: existing.lat, lng: existing.lng } : null,
  );
  // أول عنوان للعميل دائماً افتراضي ولا يمكن إلغاؤه
  const [isDefault, setIsDefault] = useState(existing?.is_default ?? firstAddress);
  const forceDefault = !existing && firstAddress;
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const useGeo = () => {
    setError("");
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    if (!window.isSecureContext) {
      setError("تحديد الموقع يتطلب اتصالاً آمناً (HTTPS).");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setError("إحداثيات غير صالحة. أعد المحاولة.");
          setLocating(false);
          return;
        }
        setCoords({ lat: latitude, lng: longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) setError("تم رفض إذن الموقع. فعّله من إعدادات المتصفح/التطبيق ثم أعد المحاولة.");
        else if (err.code === 2) setError("لا يمكن تحديد الموقع حالياً. تأكد من تشغيل GPS.");
        else if (err.code === 3) setError("انتهت مهلة تحديد الموقع. أعد المحاولة.");
        else setError("تعذّر تحديد الموقع.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const save = async () => {
    setError("");
    if (!userId) return setError("الجلسة منتهية. سجّل الدخول مجدداً.");
    if (!title.trim()) return setError("يرجى كتابة اسم للعنوان");
    if (!city || !city.trim()) return setError("يرجى اختيار المدينة");
    if (!description.trim()) return setError("يرجى كتابة وصف العنوان");
    if (!coords) return setError("يرجى تحديد موقعك على الخريطة أولاً");
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      return setError("إحداثيات غير صالحة. أعد تحديد الموقع.");
    }

    const wantDefault = forceDefault || isDefault;
    setSaving(true);
    try {
      // تحقق من أن المستخدم فعلاً مسجل الدخول
      const { data: s } = await supabase.auth.getSession();
      if (!s.session || s.session.user.id !== userId) {
        throw new Error("الجلسة منتهية. سجّل الدخول مجدداً.");
      }

      // إذا كان سيصبح افتراضياً، الغِ الافتراضي عن الباقي أولاً
      if (wantDefault) {
        const { error: clearErr } = await supabase
          .from("addresses")
          .update({ is_default: false } as any)
          .eq("user_id", userId)
          .eq("is_default", true);
        if (clearErr) throw clearErr;
      }

      if (existing) {
        const { error: e } = await supabase.from("addresses").update({
          title: title.trim(),
          city: city.trim(),
          description: description.trim(),
          lat: Number(coords.lat),
          lng: Number(coords.lng),
          is_default: wantDefault,
        } as any).eq("id", existing.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("addresses").insert({
          user_id: userId,
          title: title.trim(),
          city: city.trim(),
          description: description.trim(),
          lat: Number(coords.lat),
          lng: Number(coords.lng),
          is_default: wantDefault,
        } as any);
        if (e) throw e;
      }
      onSaved();
    } catch (e: any) {
      const msg = e?.message || e?.error_description || "تعذّر حفظ العنوان";
      const code = e?.code ? ` (${e.code})` : "";
      setError(`تعذّر حفظ العنوان: ${msg}${code}`);
      // eslint-disable-next-line no-console
      console.error("[address-save]", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <h2 className="font-display font-bold">{existing ? "تعديل العنوان" : "عنوان جديد"}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">نوع العنوان</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const sel = title === p.label;
                return (
                  <button key={p.id} onClick={() => setTitle(p.label)}
                    className={`rounded-xl p-2 border-2 flex flex-col items-center gap-1 ${sel ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-semibold">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">اسم العنوان</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: منزل والدي"
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">المدينة</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 font-medium focus:border-primary focus:outline-none">
              <option value="">— اختر المدينة —</option>
              {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {cities.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">لا توجد مدن مفعّلة. تواصل مع الإدارة.</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              وصف العنوان (الحي / الشارع / علامة مميزة / رقم المنزل)
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="مثال: حي السلام، خلف مسجد التقوى، منزل أبواب زرقاء"
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 focus:border-primary focus:outline-none resize-none" />
          </div>

          <div className="space-y-2">
            <button onClick={useGeo} disabled={locating}
              className="w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary disabled:opacity-50">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              {locating ? "جاري تحديد موقعك…" : coords ? "إعادة تحديد الموقع" : "تحديد موقعي الحالي"}
            </button>
            {coords && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                <p className="font-bold flex items-center gap-1"><MapPin className="h-3 w-3" /> الموقع محدد</p>
                <p className="font-mono mt-1">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
                <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer"
                  className="inline-block mt-1 underline">معاينة على الخريطة</a>
              </div>
            )}
          </div>

          <label className={`flex items-center gap-2 text-sm ${forceDefault ? "opacity-70" : ""}`}>
            <input type="checkbox" checked={forceDefault || isDefault} disabled={forceDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 accent-primary" />
            تعيين كعنوان افتراضي{forceDefault ? " (أول عنوان)" : ""}
          </label>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}

          <button onClick={save} disabled={saving}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {existing ? "حفظ التعديلات" : "إضافة العنوان"}
          </button>
        </div>
      </div>
    </div>
  );
}
