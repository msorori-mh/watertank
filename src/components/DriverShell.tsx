import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/wayet-auth";
import { LayoutDashboard, ListOrdered, LogOut, Loader2, Truck, Wallet, BarChart3, Settings } from "lucide-react";
import { NotificationsCenter } from "@/components/NotificationsCenter";

export type DriverInfo = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  city: string | null;
  vehicle_plate: string;
  vehicle_capacity: number;
  license_status: "pending" | "approved" | "rejected";
  availability: "available" | "busy" | "offline";
  rating: number;
  balance: number;
};

export function DriverShell({
  children,
  title,
  driver,
}: {
  children: React.ReactNode;
  title: string;
  driver: DriverInfo;
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const out = async () => { await signOut(); nav({ to: "/" }); };

  const tabs: { to: "/driver" | "/driver/orders" | "/driver/earnings" | "/driver/reports" | "/driver/settings"; label: string; icon: any; exact?: boolean }[] = [
    { to: "/driver", label: "لوحتي", icon: LayoutDashboard, exact: true },
    { to: "/driver/earnings", label: "مستحقاتي", icon: Wallet },
    { to: "/driver/orders", label: "المتاحة", icon: ListOrdered },
    { to: "/driver/reports", label: "تقاريري", icon: BarChart3 },
    { to: "/driver/settings", label: "الإعدادات", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-[#1a5276] text-white px-5 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs opacity-80">سائق</p>
              <p className="font-display font-bold">{driver.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsCenter userId={driver.user_id} variant="dark" />
            <button onClick={out} className="rounded-full p-2 bg-white/15 hover:bg-white/25">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <h1 className="font-display font-bold text-xl mt-5">{title}</h1>
      </header>

      <main className="px-5 -mt-4 max-w-md mx-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-border">
        <div className="max-w-md mx-auto flex">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to}
                className={`flex-1 flex flex-col items-center gap-1 py-3 ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function useDriverGate() {
  const nav = useNavigate();
  const [state, setState] = useState<{ loading: true } | { loading: false; user: any; driver: DriverInfo | null }>({ loading: true });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav({ to: "/driver/login" }); return; }
      const { data: d } = await supabase.from("drivers").select("*").eq("user_id", session.user.id).maybeSingle();
      if (active) setState({ loading: false, user: session.user, driver: (d as any) || null });
    };
    load();
    return () => { active = false; };
  }, [nav]);

  return state;
}

export function DriverLoading() {
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}
