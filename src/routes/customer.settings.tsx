import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/wayet-auth";
import { ChevronRight, Loader2, LogOut, User, Bell, Info, Save, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/customer/settings")({
  component: CustomerSettings,
});

const APP_VERSION = "1.0.0";

function CustomerSettings() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [notif, setNotif] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { nav({ to: "/customer/login" }); return; }
      setUserId(s.session.user.id);
      const [{ data: prof }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", s.session.user.id).maybeSingle(),
        supabase.from("cities").select("id,name").eq("is_active", true).order("name"),
      ]);
      setCities(c || []);
      if (prof) {
        setName(prof.name || "");
        setPhone(prof.phone || "");
        setEmail(prof.email || "");
        setCity(prof.city || "");
        setNotif(prof.notifications_enabled !== false);
      }
      setLoading(false);
    })();
  }, [nav]);

  const save = async () => {
    if (!userId) return;
    setError("");
    if (!name.trim()) { setError("الرجاء إدخال الاسم"); return; }
    if (!phone.trim()) { setError("رقم الهاتف مطلوب"); return; }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { setError("بريد إلكتروني غير صالح"); return; }
    setSaving(true);
    const { error: e } = await supabase.from("profiles").update({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      city: city || null,
      notifications_enabled: notif,
    }).eq("id", userId);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const out = async () => { await signOut(); nav({ to: "/" }); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-6 pt-8 pb-10 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <Link to="/customer" className="text-sm flex items-center gap-1 opacity-90">
            <ChevronRight className="h-4 w-4" /> رجوع
          </Link>
          <h1 className="font-display font-bold text-lg">الإعدادات</h1>
          <span className="w-10" />
        </div>
      </header>

      <main className="px-5 -mt-6 max-w-md mx-auto space-y-4">
        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
          <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> الحساب
          </h2>
          <div className="space-y-3">
            <Field label="الاسم" value={name} onChange={setName} />
            <Field label="رقم الهاتف" value={phone} onChange={setPhone} type="tel" />
            <Field label="البريد الإلكتروني (اختياري)" value={email} onChange={setEmail} type="email" />
            <div>
              <label className="text-xs font-semibold text-muted-foreground">المدينة الافتراضية</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">اختر المدينة</option>
                {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> الإشعارات
          </h2>
          <Toggle label="تشغيل الإشعارات الداخلية" value={notif} onChange={setNotif} />
        </section>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}
        {savedAt && (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> تم حفظ الإعدادات
          </p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-2xl bg-primary text-primary-foreground font-bold py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          حفظ التغييرات
        </button>

        <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> التطبيق
          </h2>
          <div className="flex items-center justify-between text-sm py-2 border-b border-border">
            <span className="text-muted-foreground">إصدار التطبيق</span>
            <span className="font-semibold">{APP_VERSION}</span>
          </div>
          <button
            onClick={out}
            className="w-full mt-3 rounded-xl border border-destructive/30 text-destructive py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
        </section>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between py-2"
    >
      <span className="text-sm">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${value ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${value ? "right-0.5" : "right-5"}`} />
      </span>
    </button>
  );
}
