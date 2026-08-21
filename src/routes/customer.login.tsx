import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PhonePasswordAuth } from "@/components/PhonePasswordAuth";

export const Route = createFileRoute("/customer/login")({
  component: CustomerLogin,
});

function CustomerLogin() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 py-4 flex items-center gap-3">
        <Link to="/" className="rounded-full p-2 hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </Link>
        <h1 className="font-display font-bold text-lg">بوابة العميل</h1>
      </header>

      <main className="flex-1 px-6 py-6 flex items-center max-w-md mx-auto w-full">
        <PhonePasswordAuth
          portal="customer"
          onAuthenticated={async (mode) => {
            nav({ to: mode === "register" ? "/customer/profile/complete" : "/customer" });
          }}
        />
      </main>
    </div>
  );
}
