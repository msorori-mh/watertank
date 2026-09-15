import { useEffect, useState } from "react";
import { dispatchCall, dispatchEnabled } from "@/lib/dispatch";

export function DispatchStatus({ orderId }: { orderId: string }) {
  const [state, setState] = useState("");
  useEffect(() => {
    if (!dispatchEnabled) return;
    let active = true;
    const load = async () => {
      try {
        const data = await dispatchCall<{state: string} | null>("dispatch_status", {_order_id: orderId});
        if (active) setState(data?.state || "");
      } catch { if (active) setState(""); }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [orderId]);
  if (!dispatchEnabled || !["searching", "manual"].includes(state)) return null;
  return <p role="status" className="bg-card rounded-xl p-4">{state === "searching"
    ? "جارٍ البحث عن سائق مناسب قريب منك… سنعرض بياناته بعد قبوله الطلب."
    : "لم يقبل سائق الطلب بعد. طلبك ينتظر الإسناد اليدوي من فريق التشغيل."}</p>;
}

export function DispatchManualQueue() {
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!dispatchEnabled) return;
    let active = true;
    const load = async () => {
      try {
        const data = await dispatchCall<{order_id: string}[]>("dispatch_manual_queue");
        if (active) { setIds(data.map(x => x.order_id)); setError(false); }
      } catch { if (active) setError(true); }
    };
    void load(); const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  if (!dispatchEnabled) return null;
  return <section className="bg-card rounded-xl p-4 mb-4" aria-label="طلبات الإسناد اليدوي">
    <p className="font-bold">بانتظار تدخل التشغيل: {ids.length}</p>
    {error && <p role="alert">تعذر تحديث قائمة الإسناد اليدوي.</p>}
    {ids.map(id => <p className="font-mono text-sm" key={id}>#{id.slice(0,8).toUpperCase()}</p>)}
    {ids.length > 0 && <p>حدد الطلب في الجدول أدناه واختر سائقًا مناسبًا متاحًا.</p>}
  </section>;
}
