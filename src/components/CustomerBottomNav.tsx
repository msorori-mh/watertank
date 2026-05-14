import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListOrdered, Wallet, MapPin, Settings } from "lucide-react";

const tabs = [
  { to: "/customer", label: "الرئيسية", icon: Home, exact: true },
  { to: "/customer/reports", label: "طلباتي", icon: ListOrdered },
  { to: "/customer/wallet", label: "المحفظة", icon: Wallet },
  { to: "/customer/addresses", label: "العناوين", icon: MapPin },
  { to: "/customer/settings", label: "الإعدادات", icon: Settings },
] as const;

export function CustomerBottomNav() {
  const loc = useLocation();
  return (
    <nav
      aria-label="القائمة السفلية"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-border safe-pb shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.08)]"
    >
      <div className="max-w-md mx-auto flex">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.exact
            ? loc.pathname === t.to
            : loc.pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] active:scale-95 transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition`} />
              <span className="text-[10px] font-bold">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
