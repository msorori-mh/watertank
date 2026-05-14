import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/wayet-auth";
import { LayoutDashboard, ClipboardList, Truck, MapPin, Users, Wallet, BarChart3, LogOut, Loader2, Droplets, Percent, CreditCard, WalletCards, Banknote } from "lucide-react";

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) { nav({ to: "/admin/login" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.session.user.id);
      if (!roles?.some(r => r.role === "admin")) {
        await supabase.auth.signOut();
        nav({ to: "/admin/login" });
        return;
      }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.session.user.id).maybeSingle();
      setProfile(prof);
      setReady(true);
    });
    return () => { active = false; };
  }, [nav]);

  const out = async () => { await signOut(); nav({ to: "/admin/login" }); };

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const tabs: { to: "/admin" | "/admin/orders" | "/admin/drivers" | "/admin/customers" | "/admin/cities" | "/admin/commissions" | "/admin/payment-methods" | "/admin/wallet-topups" | "/admin/driver-withdrawals" | "/admin/finance" | "/admin/reports"; label: string; icon: any; exact?: boolean }[] = [
    { to: "/admin", label: "اللوحة", icon: LayoutDashboard, exact: true },
    { to: "/admin/orders", label: "الطلبات", icon: ClipboardList },
    { to: "/admin/drivers", label: "السائقون", icon: Truck },
    { to: "/admin/customers", label: "العملاء", icon: Users },
    { to: "/admin/cities", label: "المدن والأسعار", icon: MapPin },
    { to: "/admin/commissions", label: "العمولات", icon: Percent },
    { to: "/admin/payment-methods", label: "طرق الدفع", icon: CreditCard },
    { to: "/admin/wallet-topups", label: "تعبئة المحافظ", icon: WalletCards },
    { to: "/admin/driver-withdrawals", label: "سحوبات السائقين", icon: Banknote },
    { to: "/admin/finance", label: "المالية", icon: Wallet },
    { to: "/admin/reports", label: "التقارير", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="md:w-64 bg-white border-l border-border md:min-h-screen">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Droplets className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">لوحة الإدارة</p>
            <p className="font-display font-bold text-sm truncate">{profile?.name || profile?.email || "مدير"}</p>
          </div>
        </div>
        <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap ${active ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" : "hover:bg-slate-100 text-deep"}`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
          <button onClick={out} className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-destructive hover:bg-destructive/10 md:mt-4">
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-8">
        <h1 className="font-display font-bold text-2xl mb-6">{title}</h1>
        {children}
      </main>
    </div>
  );
}
