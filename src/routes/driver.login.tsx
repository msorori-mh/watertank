import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PhonePasswordAuth } from "@/components/PhonePasswordAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSessionRestore } from "@/lib/session-restore";

export const Route = createFileRoute("/driver/login")({
  component: DriverLogin,
});

function DriverLogin() {
  const nav = useNavigate();
  const restoring = useSessionRestore();

  if (restoring) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">جارٍ استعادة الجلسة…</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-4 flex items-center gap-3">
        <Link to="/" className="rounded-full p-2 hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </Link>
        <h1 className="font-display font-bold text-lg">بوابة السائق</h1>
      </header>

      <main className="flex-1 px-6 py-6 flex items-center max-w-md mx-auto w-full">
        <PhonePasswordAuth
          portal="driver"
          onAuthenticated={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("تعذّر التحقق من الجلسة");
            const { data: driverRow } = await supabase
              .from("drivers")
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle();
            nav({ to: driverRow ? "/driver" : "/driver/register" });
          }}
        />
      </main>
    </div>
  );
}
