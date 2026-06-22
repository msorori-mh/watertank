import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/AdminShell";
import { adminRouteGuard } from "@/lib/route-guards";
import { Loader2, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/cities")({
  ...adminRouteGuard,
  component: AdminCities,
});

const SIZES = [1000, 3000, 5000, 10000];

function AdminCities() {
  const [cities, setCities] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [newCity, setNewCity] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("cities").select("*").order("name"),
      supabase.from("pricing").select("*"),
    ]);
    setCities(c || []); setPricing(p || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addCity = async () => {
    if (!newCity.trim()) return;
    await supabase.from("cities").insert({ name: newCity.trim() });
    setNewCity("");
    load();
  };

  const toggleCity = async (id: string, active: boolean) => {
    await supabase.from("cities").update({ is_active: active }).eq("id", id);
    load();
  };

  const setPrice = async (city: string, capacity: number, price: number) => {
    const existing = pricing.find(p => p.city === city && p.capacity === capacity);
    if (existing) await supabase.from("pricing").update({ price }).eq("id", existing.id);
    else await supabase.from("pricing").insert({ city, capacity, price });
    load();
  };

  const deletePrice = async (id: string) => {
    await supabase.from("pricing").delete().eq("id", id);
    load();
  };

  return (
    <AdminShell title="المدن والأسعار">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] p-5 mb-6">
        <h2 className="font-display font-bold mb-3">إضافة مدينة جديدة</h2>
        <div className="flex gap-2">
          <input
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="اسم المدينة (مثال: مأرب)"
            className="flex-1 rounded-xl border-2 border-input px-4 py-2.5 focus:border-primary focus:outline-none"
          />
          <button onClick={addCity} className="rounded-xl bg-primary text-primary-foreground px-5 font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> إضافة
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[var(--shadow-soft)] overflow-x-auto">
        <div className="p-5 border-b border-border">
          <h2 className="font-display font-bold">جدول الأسعار حسب المدينة والحجم (ر.ي)</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3">المدينة</th>
                {SIZES.map(s => <th key={s} className="text-right p-3">{s.toLocaleString("ar-EG")} لتر</th>)}
                <th className="text-right p-3">نشطة</th>
              </tr>
            </thead>
            <tbody>
              {cities.map(c => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-medium">{c.name}</td>
                  {SIZES.map(s => {
                    const row = pricing.find(p => p.city === c.name && p.capacity === s);
                    return (
                      <td key={s} className="p-3">
                        <div className="flex gap-1 items-center">
                          <input
                            type="number"
                            defaultValue={row?.price || ""}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v > 0 && v !== Number(row?.price)) setPrice(c.name, s, v);
                            }}
                            className="w-24 rounded border border-border px-2 py-1 text-sm"
                            placeholder="—"
                          />
                          {row && (
                            <button onClick={() => deletePrice(row.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-3">
                    <input type="checkbox" checked={c.is_active} onChange={(e) => toggleCity(c.id, e.target.checked)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
