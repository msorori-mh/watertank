import { useEffect, useRef, useState } from "react";

// Import Leaflet only after mount: browser globals are unavailable during SSR.
export function LocationPicker({ value, onChange }: {
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const changed = useRef(onChange);
  changed.current = onChange;
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([L]) => {
      if (disposed || !container.current) return;
      // A map center is NOT a selected address; only an explicit tap confirms a point.
      map = L.map(container.current).setView(value ? [value.lat, value.lng] : [15.462, 45.325], 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      }).on("tileerror", () => setError("تعذر تحميل الخريطة. تحقق من الإنترنت أو استخدم تحديد الموقع الحالي.")).addTo(map);
      let marker: import("leaflet").CircleMarker | undefined;
      if (value) marker = L.circleMarker([value.lat, value.lng]).addTo(map);
      map.on("click", (event: import("leaflet").LeafletMouseEvent) => {
        const point = { lat: event.latlng.lat, lng: event.latlng.lng };
        marker?.remove(); marker = L.circleMarker(event.latlng).addTo(map!);
        changed.current(point);
      });
    }).catch(() => setError("تعذر فتح الخريطة؛ تحقق من الاتصال ثم أعد المحاولة."));
    return () => { disposed = true; map?.remove(); };
  }, []);
  return <div className="space-y-2">
    <p className="text-sm">حرّك الخريطة واضغط على موقع التوصيل لتحديده.</p>
    <div ref={container} className="h-64 rounded-xl overflow-hidden relative z-0" aria-label="خريطة تحديد موقع التوصيل" />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
