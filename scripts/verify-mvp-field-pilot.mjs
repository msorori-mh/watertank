// MVP-FIELD-PILOT-01 verification contract.
// Run: node scripts/verify-mvp-field-pilot.mjs
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };

// 1) driver registration collects plate / capacity / city and states the approval gate
const reg = read("src/routes/driver.register.tsx");
expect(/vehicle_plate:\s*plate/.test(reg), "driver.register must submit vehicle_plate");
expect(/vehicle_capacity:\s*capacity/.test(reg), "driver.register must submit vehicle_capacity");
expect(/city,/.test(reg), "driver.register must submit city");
expect(/رقم لوحة المركبة/.test(reg), "driver.register must show the plate field label");
expect(/سعة الوايت \(لتر\)/.test(reg), "driver.register must show the capacity field label");
expect(/المدينة \/ منطقة العمل/.test(reg), "driver.register must label city as work area");
expect(/بانتظار موافقة الإدارة/.test(reg), "driver.register must state the pending-approval status");
for (const [field, msg] of [
  ["name", "الاسم الكامل مطلوب"],
  ["phone", "رقم الهاتف مطلوب"],
  ["plate", "رقم لوحة المركبة مطلوب"],
  ["capacity", "اختر سعة الوايت باللتر"],
  ["city", "اختر المدينة / منطقة العمل"],
]) expect(reg.includes(msg), `driver.register must validate ${field} with its own message`);

// 2) pending drivers are blocked from receiving orders
const dIndex = read("src/routes/driver.index.tsx");
const dOrders = read("src/routes/driver.orders.tsx");
expect(/license_status !== "approved"/.test(dIndex), "driver.index must gate on license_status");
expect(/بانتظار موافقة الإدارة/.test(dIndex), "driver.index must show the pending state");
expect(/license_status !== "approved"/.test(dOrders), "driver.orders must gate on license_status");
expect(dOrders.indexOf('license_status !== "approved"') < dOrders.indexOf("const accept ="),
  "driver.orders must return the pending screen before exposing the accept flow");

// 3) unified Arabic order status wording
const statusLib = read("src/lib/order-status.ts");
for (const label of [
  "جاري البحث عن سائق", "تم قبول الطلب", "السائق في الطريق",
  "وصل السائق", "جاري تفريغ الماء", "اكتمل الطلب", "ملغي", "مرفوض",
]) expect(statusLib.includes(label), `order-status must define the label ${label}`);
for (const key of ["pending", "approved", "assigned", "accepted", "on_the_way",
  "arrived", "delivering", "payment_collected", "completed", "cancelled", "rejected"]) {
  expect(new RegExp(`\\b${key}:`).test(statusLib), `order-status must map ${key}`);
}
for (const file of [
  "src/routes/customer.index.tsx",
  "src/routes/customer.orders.$id.tsx",
  "src/routes/customer.reports.tsx",
  "src/routes/driver.index.tsx",
]) {
  const src = read(file);
  expect(/@\/lib\/order-status/.test(src), `${file} must import labels from @/lib/order-status`);
  for (const stale of ["قيد المراجعة", "في الطريق إليك", "بدأ الصب", "يصب الماء", "ملغى"]) {
    expect(!src.includes(stale), `${file} must not keep the stale label ${stale}`);
  }
}

// 4) cash-only order flow keeps its summary before confirmation
const order = read("src/routes/customer.order.tsx");
expect(order.includes("create_cash_order"), "customer.order must stay on create_cash_order");
expect(!order.includes("create_wallet_order"), "customer.order must not call create_wallet_order");
expect(/ملخص الطلب قبل التأكيد/.test(order), "customer.order must show a pre-confirmation summary");
expect(/سعة الوايت/.test(order) && /السعر النقدي المتوقع/.test(order) && /العنوان \/ أقرب معلم/.test(order),
  "summary must include capacity, expected cash price and address/landmark");

// 5) driver privacy fix stays in place
const detail = read("src/routes/customer.orders.$id.tsx");
expect(detail.includes('supabase.rpc("get_order_driver_public"'),
  "customer order detail must read the driver via get_order_driver_public");
expect(!/from\("drivers"\)/.test(detail), "customer order detail must not read public.drivers directly");

if (failures.length) {
  console.error("MVP-FIELD-PILOT-01 verification FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("MVP-FIELD-PILOT-01 verification PASS");
