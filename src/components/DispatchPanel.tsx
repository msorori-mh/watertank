import { useEffect, useState } from "react";
import { currentLocation } from "@/lib/current-location";
import { dispatchCall, dispatchEnabled, type DispatchOffer } from "@/lib/dispatch";

export function DispatchPanel({ available }: { available: boolean }) {
  const [tracking, setTracking] = useState(false);
  const [water, setWater] = useState("normal");
  const [offer, setOffer] = useState<DispatchOffer | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!available) { setTracking(false); setOffer(null); } }, [available]);
  useEffect(() => {
    if (!dispatchEnabled || !available || !tracking) return;
    let active = true;
    let running = false;
    let lastPosition = 0;
    let lastPoll = 0;
    const poll = async () => {
      if (running || document.visibilityState !== "visible" || Date.now() - lastPoll < 5000) return;
      running = true;
      lastPoll = Date.now();
      try {
        if (Date.now() - lastPosition > 30000) {
          const p = await currentLocation();
          if (!active) return;
          await dispatchCall("dispatch_heartbeat", { _lat: p.lat, _lng: p.lng, _water_type: water });
          lastPosition = Date.now();
        }
        const next = await dispatchCall<DispatchOffer | null>("dispatch_offer");
        if (!active) return;
        setOffer(next);
        setDeadline(next ? Date.now() + Date.parse(next.expires_at) - Date.parse(next.server_now) : 0);
        setError("");
      } catch {
        if (active) { setOffer(null); setError("تعذر تحديث الموقع أو استقبال العروض. تحقق من الشبكة وصلاحية الموقع."); }
      } finally { running = false; }
    };
    void poll();
    const timer = setInterval(() => { setNow(Date.now()); void poll(); }, 1000);
    return () => { active = false; clearInterval(timer); };
  }, [available, tracking, water]);
  if (!dispatchEnabled || !available) return null;
  const remaining = Math.max(0, Math.ceil((deadline - (now || Date.now())) / 1000));
  const respond = async (accept: boolean) => {
    if (!offer || busy) return;
    setBusy(true);
    try {
      await dispatchCall("dispatch_respond", { _offer_id: offer.id, _accept: accept });
      setOffer(null);
      if (accept) window.location.assign("/driver");
    } catch { setError("تعذر تأكيد الرد؛ ربما انتهت المهلة. انتظر تحديث العرض."); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl bg-card p-4 my-5 space-y-3" aria-label="عروض الطلبات">
    <p className="font-bold">استقبال طلبات قريبة</p>
    <p className="text-sm">أبقِ التطبيق مفتوحًا وحدد نوع الماء المتاح في الوايت.</p>
    <select aria-label="نوع الماء المتاح" disabled={tracking} value={water} onChange={e => setWater(e.target.value)} className="w-full border rounded-xl p-3">
      <option value="normal">ماء عادي</option><option value="kawthar">كوثر</option>
    </select>
    {!tracking && <button className="bg-primary text-white rounded-xl p-3 w-full" onClick={() => setTracking(true)}>تفعيل الموقع واستقبال العروض</button>}
    {tracking && !offer && <p>بانتظار عرض مناسب…</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {offer && <div className="space-y-3">
      <p>{offer.city} · {offer.capacity} لتر · {offer.water_type === "normal" ? "ماء عادي" : "كوثر"}</p>
      <p>قيمة الطلب: {offer.price} ر.ي — نقدًا عند التسليم</p>
      <p role="timer">متبقي للقبول: {remaining} ثانية</p>
      <div className="flex gap-3">
        <button disabled={busy || remaining <= 0} onClick={() => void respond(true)} className="bg-primary text-white rounded-xl p-3 flex-1">قبول الطلب</button>
        <button disabled={busy || remaining <= 0} onClick={() => void respond(false)} className="border rounded-xl p-3 flex-1">اعتذار</button>
      </div>
    </div>}
  </section>;
}
