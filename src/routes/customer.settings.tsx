import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/wayet-auth";
import { ChevronRight, Loader2, LogOut, User, Bell, Info, Save, CheckCircle2, MapPin, Wallet, MessageCircle, Phone, ChevronLeft, Pencil, X } from "lucide-react";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";

export const Route = createFileRoute("/customer/settings")({
  component: CustomerSettings,
});

const APP_VERSION = "1.0.0";
const SUPPORT_PHONE = "+967777000000";

function CustomerSettings() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [notif, setNotif] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { nav({ to: "/customer/login" }); return; }
      const uid = s.session.user.id;
      setUserId(uid);
      const [{ data: prof }, { data: c }, { data: w }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("cities").select("id,name").eq("is_active", true).order("name"),
        supabase.from("wallets" as any).select("balance").eq("user_id", uid).maybeSingle(),
      ]);
      setCities(c || []);
      if (prof) {
        setName(prof.name || "");
        setPhone(prof.phone || "");
        setEmail(prof.email || "");
        setCity(prof.city || "");
        setNotif(prof.notifications_enabled !== false);
      }
      setWalletBalance(Number((w as any)?.balance || 0));
      setLoading(false);
    })();
  }, [nav]);

  const flash = () => { setSavedAt(Date.now()); setTimeout(() => setSavedAt(null), 2200); };

  const saveAccount = async () => {
    if (!userId) return;
    setError("");
    if (!name.trim()) { setError("الرجاء إدخال الاسم"); return; }
    if (!phone.trim()) { setError("رقم الهاتف مطلوب"); return; }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { setError("بريد إلكتروني غير صالح"); return; }
    setSavingAccount(true);
    const { error: e } = await supabase.from("profiles").update({
      name: name.trim(), phone: phone.trim(),
      email: email.trim() || null, city: city || null,
    }).eq("id", userId);
    setSavingAccount(false);
    if (e) { setError(e.message); return; }
    setEditOpen(false);
    flash();
  };

  const toggleNotif = async (v: boolean) => {
    if (!userId) return;
    setNotif(v);
    setSavingNotif(true);
    const { error: e } = await supabase.from("profiles")
      .update({ notifications_enabled: v }).eq("id", userId);
    setSavingNotif(false);
    if (e) { setNotif(!v); setError(e.message); return; }
    flash();
  };

  const out = async () => { await signOut(); nav({ to: "/" }); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    
      <CustomerBottomNav />
    </div>
  );

  const initials = (name || "ع").trim().slice(0, 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background pb-20" dir="rtl">
      <header className="relative bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 text-white px-5 pt-6 pb-16 rounded-b-[2rem] overflow-hidden">
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -right-6 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <Link to="/customer" className="text-sm flex items-center gap-1 opacity-90 hover:opacity-100 active:scale-95 transition">
            <ChevronRight className="h-4 w-4" /> رجوع
          </Link>
          <h1 className="font-display font-bold text-lg">الإعدادات</h1>
          <span className="w-10" />
        </div>
        <div className="relative mt-5 flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold ring-2 ring-white/30">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-lg truncate">{name || "مرحباً"}</p>
            <p className="text-xs opacity-90 truncate flex items-center gap-1">
              <Phone className="h-3 w-3" /> {phone || "—"}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 -mt-10 max-w-md mx-auto space-y-3.5">
        {/* Account card */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon={User}>الحساب</SectionTitle>
            <button onClick={() => setEditOpen(true)}
              className="text-xs font-bold text-primary flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 active:scale-95 transition">
              <Pencil className="h-3.5 w-3.5" /> تعديل
            </button>
          </div>
          <Row label="الاسم" value={name || "—"} />
          <Row label="الهاتف" value={phone || "—"} />
          <Row label="البريد" value={email || "غير محدد"} />
          <Row label="المدينة" value={city || "غير محددة"} last />
        </Card>

        {/* Quick links */}
        <LinkCard
          to="/customer/addresses"
          icon={MapPin}
          title="العناوين"
          desc="إدارة عناوين التوصيل المحفوظة"
          color="from-emerald-400 to-teal-500"
        />
        <LinkCard
          to="/customer/wallet"
          icon={Wallet}
          title="المحفظة"
          desc="الرصيد الحالي والتعبئات"
          color="from-amber-400 to-orange-500"
          right={
            <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
              {walletBalance.toLocaleString()} ر.ي
            </span>
          }
        />

        {/* Notifications */}
        <Card>
          <SectionTitle icon={Bell}>الإشعارات</SectionTitle>
          <div className="mt-2 flex items-center justify-between py-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold">الإشعارات الداخلية</p>
              <p className="text-[11px] text-muted-foreground">تنبيهات الطلبات والعروض داخل التطبيق</p>
            </div>
            <Switch value={notif} onChange={toggleNotif} disabled={savingNotif} />
          </div>
        </Card>

        {/* Support */}
        <Card>
          <SectionTitle icon={MessageCircle}>الدعم</SectionTitle>
          <p className="text-xs text-muted-foreground mt-1 mb-3">نحن هنا لخدمتك في أي وقت 💙</p>
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://wa.me/${SUPPORT_PHONE.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"
              className="rounded-xl bg-emerald-500 text-white py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-sm">
              <MessageCircle className="h-4 w-4" /> واتساب
            </a>
            <a href={`tel:${SUPPORT_PHONE}`}
              className="rounded-xl border-2 border-primary/20 text-primary py-2.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition">
              <Phone className="h-4 w-4" /> اتصال
            </a>
          </div>
          <p className="text-[11px] text-center text-muted-foreground mt-2.5" dir="ltr">{SUPPORT_PHONE}</p>
        </Card>

        {/* App */}
        <Card>
          <SectionTitle icon={Info}>التطبيق</SectionTitle>
          <Row label="إصدار التطبيق" value={APP_VERSION} last />
          <button onClick={out}
            className="mt-3 w-full rounded-xl border border-destructive/30 text-destructive py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-destructive/5 active:scale-95 transition">
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
        </Card>

        {savedAt && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> تم الحفظ
            </p>
          </div>
        )}
      </main>

      {/* Edit sheet */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditOpen(false)}>
          <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">تعديل الحساب</h2>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="الاسم" value={name} onChange={setName} />
              <Field label="رقم الهاتف" value={phone} onChange={setPhone} type="tel" />
              <Field label="البريد الإلكتروني (اختياري)" value={email} onChange={setEmail} type="email" />
              <div>
                <label className="text-xs font-semibold text-muted-foreground">المدينة الافتراضية</label>
                <select value={city} onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                  <option value="">اختر المدينة</option>
                  {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{error}</p>}
              <button onClick={saveAccount} disabled={savingAccount}
                className="w-full rounded-2xl bg-primary text-primary-foreground font-bold py-3.5 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition">
                {savingAccount ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4">{children}</section>;
}

function SectionTitle({ icon: Icon, children }: any) {
  return (
    <h2 className="font-display font-bold text-sm flex items-center gap-2">
      <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </span>
      {children}
    </h2>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 text-sm ${last ? "" : "border-b border-border/60"}`}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold truncate max-w-[60%] text-left" dir="auto">{value}</span>
    </div>
  );
}

function LinkCard({ to, icon: Icon, title, desc, color, right }: any) {
  return (
    <Link to={to} className="block rounded-2xl bg-card shadow-[var(--shadow-soft)] p-4 active:scale-[0.98] transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-sm`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
        </div>
        {right}
        <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}

function Switch({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!value)} disabled={disabled}
      className={`relative h-7 w-12 rounded-full transition shrink-0 ${value ? "bg-primary" : "bg-muted"} ${disabled ? "opacity-60" : ""}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${value ? "right-0.5" : "right-[1.375rem]"}`} />
    </button>
  );
}
