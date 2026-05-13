import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

type Notif = {
  id: string;
  user_id: string;
  order_id: string | null;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationsCenter({
  userId,
  variant = "light",
}: {
  userId: string;
  variant?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as Notif[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    load();
    const ch = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unread = items.filter((i) => !i.is_read).length;

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAll = async () => {
    if (unread === 0) return;
    setMarking(true);
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setMarking(false);
  };

  const btnBg =
    variant === "dark"
      ? "bg-white/15 hover:bg-white/25 text-white"
      : "bg-slate-100 hover:bg-slate-200 text-deep";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative rounded-full p-2 ${btnBg}`}
        aria-label="الإشعارات"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl border border-border z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-slate-50">
            <p className="font-display font-bold text-sm text-deep">الإشعارات</p>
            <button
              onClick={markAll}
              disabled={unread === 0 || marking}
              className="text-xs font-semibold text-primary disabled:text-muted-foreground flex items-center gap-1"
            >
              {marking && <Loader2 className="h-3 w-3 animate-spin" />}
              <CheckCheck className="h-3 w-3" /> تعليم الكل كمقروء
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin inline text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
            ) : (
              <ul>
                {items.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => !n.is_read && markOne(n.id)}
                    className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer ${
                      n.is_read ? "bg-white" : "bg-primary/5"
                    } hover:bg-slate-50`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-deep">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString("ar-EG")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
