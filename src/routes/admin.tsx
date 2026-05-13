import { createFileRoute, Link, useNavigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/wayet-auth";
import { LayoutDashboard, ClipboardList, Truck, MapPin, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
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
  }, [nav]);

  const out = async () => { await signOut(); nav({ to: "/" }); };

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const tabs = [
    { to: "/admin", label: "اللوحة", icon: LayoutDashboard, exact: true },
    { to: "/admin/orders", label: "الطلبات", icon: ClipboardList },
    { to: "/admin/drivers", label: "السائقين", icon: Truck },
    { to: "/admin/cities", label: "المدن والأسعار", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="md:w-64 bg-card border-l border-border md:min-h-screen">
        <div className="p-5 border-b border-border">
          <p className="text-xs text-muted-foreground">لوحة الإدارة</p>
          <p className="font-display font-bold">{profile?.name || profile?.email || "مدير"}</p>
        </div>
        <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-deep"}`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
          <button onClick={out} className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-destructive hover:bg-destructive/10 md:mt-auto">
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
