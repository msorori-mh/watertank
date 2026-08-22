import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("967")) return `+${digits}`;
  if (digits.startsWith("0")) return `+967${digits.slice(1)}`;
  return `+967${digits}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("unauthorized");

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) throw new Error("unauthorized");

    const admin = createClient(url, service);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("admin required");

    const body = await req.json();
    const phone = normalizePhone(String(body.phone || ""));
    const password = String(body.password || "");
    if (phone.replace(/\D/g, "").length < 9) throw new Error("invalid phone");
    if (password.length < 8) throw new Error("password must be at least 8 characters");

    const email = `phone-${phone.replace(/\D/g, "")}@wayet.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        phone,
        name: "",
        type: "driver",
        city: body.city || null,
        must_complete_profile: true,
        must_change_password: true,
      },
    });
    if (error) throw error;

    const userId = data.user.id;
    const { error: roleError } = await admin.from("user_roles").upsert(
      { user_id: userId, role: "driver" },
      { onConflict: "user_id,role" },
    );
    if (roleError) {
      await admin.auth.admin.deleteUser(userId);
      throw roleError;
    }

    await admin.from("profiles").upsert({
      id: userId,
      phone,
      name: "",
      user_type: "driver",
    });

    return new Response(JSON.stringify({ ok: true, user_id: userId, phone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: /unauthorized|admin required/.test(message) ? 403 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
