import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "order_approved"
  | "order_rejected"
  | "order_accepted"
  | "order_on_way"
  | "order_arrived"
  | "order_unloading"
  | "order_payment_collected"
  | "order_completed"
  | "order_cancelled"
  | "driver_approved"
  | "driver_rejected"
  | "general";

export async function notifyUser(
  userId: string,
  orderId: string | null,
  type: NotificationType,
  title: string,
  body: string,
) {
  if (!userId) return;
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    order_id: orderId,
    type,
    title,
    body,
  });
  if (error) console.warn("notifyUser failed:", error.message);
}

/** خرائط رسائل قياسية لأحداث الطلب */
export const ORDER_EVENT_MESSAGES: Partial<
  Record<NotificationType, { title: string; body: (orderShort: string) => string }>
> = {
  order_approved: {
    title: "تم اعتماد طلبك",
    body: (n) => `الطلب #${n} تم اعتماده من الإدارة وسيظهر للسائقين قريباً.`,
  },
  order_rejected: {
    title: "تم رفض الطلب",
    body: (n) => `الطلب #${n} تم رفضه من الإدارة. يمكنك التواصل معنا لمعرفة السبب.`,
  },
  order_accepted: {
    title: "قَبِل السائق طلبك",
    body: (n) => `سائق وايت الماء قَبِل الطلب #${n} وسيبدأ التحرك قريباً.`,
  },
  order_on_way: {
    title: "السائق في الطريق إليك",
    body: (n) => `سائق الطلب #${n} انطلق نحو موقعك الآن.`,
  },
  order_arrived: {
    title: "وصل السائق",
    body: (n) => `وصل سائق الطلب #${n} إلى موقعك.`,
  },
  order_unloading: {
    title: "بدأ تفريغ الماء",
    body: (n) => `بدأ السائق صب الماء — الطلب #${n}.`,
  },
  order_payment_collected: {
    title: "تم استلام المبلغ",
    body: (n) => `تم استلام مبلغ الطلب #${n} من قِبَل السائق.`,
  },
  order_completed: {
    title: "اكتمل الطلب",
    body: (n) => `الطلب #${n} اكتمل بنجاح. شكراً لاستخدامك وايت ماء!`,
  },
  order_cancelled: {
    title: "تم إلغاء الطلب",
    body: (n) => `الطلب #${n} تم إلغاؤه.`,
  },
};

export const shortId = (id: string) => id.slice(0, 8).toUpperCase();
