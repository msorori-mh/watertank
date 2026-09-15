import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export async function currentLocation() {
  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.requestPermissions({ permissions: ["location"] });
    if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
      throw new Error("اسمح للتطبيق بالوصول إلى الموقع من إعدادات الهاتف، أو اختر موقعك يدويًا.");
    }
  }
  const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}
