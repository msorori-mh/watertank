import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/wayet-auth";
import { useDriverGate, DriverLoading } from "@/components/DriverShell";
import { ChevronRight, Loader2, LogOut, User, Bell, Info, Save, CheckCircle2, Truck, Banknote, Power, Building2, Smartphone, Phone } from "lucide-react";


export const Route = createFileRoute("/driver/settings")({
  component: DriverSettings,
});

const APP_VERSION = "1.0.0";
type PayoutType = "bank" | "transfer_network";

function DriverSettings() {
  const nav = useNavigate();
  const gate = useDriverGate();
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [profileEmail, setProfileEmail] = useState("");
  const [profileNotif, setProfileNotif] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState<number>(0);
  const [availability, setAvailability] = useState<"available" | "busy" | "offline">("offline");
  const [notif, setNotif] = useState(true);
  const [payoutType, setPayoutType] = useState<PayoutType>("bank");
  // bank
  const [bankName, setBankName] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  // transfer network
  const [transferRecipientName, setTransferRecipientName] = useState("");
  const [transferPhone, setTransferPhone] = useState("");
  const [transferNetworkName, setTransferNetworkName] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (gate.loading || !gate.driver) return;
    const d = gate.driver as any;
    setName(d.name || "");
    setPhone(d.phone || "");
    setCity(d.city || "");
    setPlate(d.vehicle_plate || "");
    setCapacity(d.vehicle_capacity || 0);
    
    setAvailability(d.availability || "offline");
    setNotif(d.notifications_enabled !== false);
    setPayoutMethod(d.payout_method || "cash");
    setPayoutAccount(d.payout_account || "");
    setPayoutName(d.payout_recipient_name || d.name || "");

    (async () => {
      const [{ data: c }, { data: prof }] = await Promise.all([
        supabase.from("cities").select("id,name").eq("is_active", true).order("name"),
        supabase.from("profiles").select("email,notifications_enabled").eq("id", d.user_id).maybeSingle(),
      ]);
      setCities(c || []);
      if (prof) {
        setProfileEmail(prof.email || "");
        setProfileNotif(prof.notifications_enabled !== false);
      }
      setBootstrapped(true);
    })();
  }, [gate]);

  if (gate.loading || !gate.driver || !bootstrapped) return <DriverLoading />;
  const driver = gate.driver;

  const save = async () => {
    setError("");
    if (!name.trim()) { setError("الرجاء إدخال الاسم"); return; }
    if (!phone.trim()) { setError("رقم الهاتف مطلوب"); return; }
    if (!plate.trim()) { setError("رقم اللوحة مطلوب"); return; }
    if (!capacity || capacity <= 0) { setError("سعة الوايت غير صالحة"); return; }
    if (profileEmail && !/^\S+@\S+\.\S+$/.test(profileEmail)) { setError("بريد إلكتروني غير صالح"); return; }
    setSaving(true);

    const [{ error: dErr }, { error: pErr }] = await Promise.all([
      supabase.from("drivers").update({
        name: name.trim(),
        phone: phone.trim(),
        city: city || null,
        vehicle_plate: plate.trim(),
        vehicle_capacity: capacity,
        availability,
        notifications_enabled: notif,
        payout_method: payoutMethod,
        payout_account: payoutAccount.trim() || null,
        payout_recipient_name: payoutName.trim() || null,
      } as any).eq("id", driver.id),
      supabase.from("profiles").update({
        email: profileEmail.trim() || null,
        phone: phone.trim(),
        name: name.trim(),
        notifications_enabled: profileNotif,
      }).eq("id", driver.user_id),
    ]);
    setSaving(false);
    if (dErr || pErr) { setError(dErr?.message || pErr?.message || "فشل الحفظ"); return; }
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const out = async () => { await signOut(); nav({ to: "/" }); };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-[#1a5276] text-white px-5 pt-6 pb-10 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <Link to="/driver" className="text-sm flex items-center gap-1 opacity-90">
            <ChevronRight className="h-4 w-4" /> رجوع
          </Link>
          <h1 className="font-display font-bold text-lg">الإعدادات</h1>
          <span className="w-10" />
        </div>
      </header>

      <main className="px-5 -mt-6 max-w-md mx-auto space-y-4">
        <Section icon={User} title="الحساب">
          <Field label="الاسم" value={name} onChange={setName} />
          <Field label="رقم الهاتف" value={phone} onChange={setPhone} type="tel" />
          <Field label="البريد الإلكتروني (اختياري)" value={profileEmail} onChange={setProfileEmail} type="email" />
          <div>
            <label className="text-xs font-semibold text-muted-foreground">المدينة</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
              <option value="">اختر المدينة</option>
              {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </Section>

        <Section icon={Truck} title="المركبة">
          <Field label="رقم اللوحة" value={plate} onChange={setPlate} />
          <Field label="السعة (لتر)" value={String(capacity || "")} onChange={(v) => setCapacity(Number(v) || 0)} type="number" />
        </Section>

        <Section icon={Banknote} title="السحب والمستحقات">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">طريقة الاستلام</label>
            <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
              {PAYOUT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <Field label="اسم المستفيد" value={payoutName} onChange={setPayoutName} />
          <Field label="رقم الحساب أو الهاتف" value={payoutAccount} onChange={setPayoutAccount} />
        </Section>

        <Section icon={Power} title="التوفر">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "available", label: "متاح", color: "bg-emerald-500" },
              { v: "busy", label: "مشغول", color: "bg-amber-500" },
              { v: "offline", label: "غير متاح", color: "bg-slate-400" },
            ].map(o => (
              <button key={o.v} type="button" onClick={() => setAvailability(o.v as any)}
                className={`rounded-xl border-2 py-2.5 text-xs font-bold transition ${
                  availability === o.v ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                }`}>
                <span className={`inline-block h-2 w-2 rounded-full ${o.color} ml-1`} />
                {o.label}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={Bell} title="الإشعارات">
          <Toggle label="تشغيل إشعارات السائق" value={notif} onChange={setNotif} />
          <Toggle label="تشغيل الإشعارات الداخلية" value={profileNotif} onChange={setProfileNotif} />
        </Section>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}
        {savedAt && (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> تم حفظ الإعدادات
          </p>
        )}

        <button onClick={save} disabled={saving}
          className="w-full rounded-2xl bg-primary text-primary-foreground font-bold py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          حفظ التغييرات
        </button>

        <Section icon={Info} title="التطبيق">
          <div className="flex items-center justify-between text-sm py-2 border-b border-border">
            <span className="text-muted-foreground">إصدار التطبيق</span>
            <span className="font-semibold">{APP_VERSION}</span>
          </div>
          <button onClick={out}
            className="w-full mt-3 rounded-xl border border-destructive/30 text-destructive py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive/5">
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
        </Section>
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-5">
      <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="w-full flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${value ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${value ? "right-0.5" : "right-5"}`} />
      </span>
    </button>
  );
}
