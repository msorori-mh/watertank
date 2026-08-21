// MVP-FIELD-PILOT-01: single source of truth for the Arabic order status wording
// shown to customers and drivers. Do not fork these strings in route files.

export type OrderStatusKey =
  | "pending"
  | "approved"
  | "assigned"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "delivering"
  | "payment_collected"
  | "completed"
  | "cancelled"
  | "rejected";

export const ORDER_STATUS_LABELS: Record<OrderStatusKey, string> = {
  pending: "جاري البحث عن سائق",
  approved: "جاري البحث عن سائق",
  assigned: "تم قبول الطلب",
  accepted: "تم قبول الطلب",
  on_the_way: "السائق في الطريق",
  arrived: "وصل السائق",
  delivering: "جاري تفريغ الماء",
  payment_collected: "اكتمل الطلب",
  completed: "اكتمل الطلب",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

export const ORDER_STATUS_PROGRESS: Record<OrderStatusKey, number> = {
  pending: 10,
  approved: 20,
  assigned: 40,
  accepted: 45,
  on_the_way: 65,
  arrived: 85,
  delivering: 95,
  payment_collected: 100,
  completed: 100,
  cancelled: 0,
  rejected: 0,
};

/** Ordered timeline shown to the customer (collapsed to the unified wording). */
export const ORDER_TIMELINE: { key: OrderStatusKey; label: string }[] = [
  { key: "pending", label: ORDER_STATUS_LABELS.pending },
  { key: "accepted", label: ORDER_STATUS_LABELS.accepted },
  { key: "on_the_way", label: ORDER_STATUS_LABELS.on_the_way },
  { key: "arrived", label: ORDER_STATUS_LABELS.arrived },
  { key: "delivering", label: ORDER_STATUS_LABELS.delivering },
  { key: "completed", label: ORDER_STATUS_LABELS.completed },
];

export function orderStatusLabel(status: string | null | undefined): string {
  if (!status) return ORDER_STATUS_LABELS.pending;
  return ORDER_STATUS_LABELS[status as OrderStatusKey] ?? status;
}

export function orderStatusProgress(status: string | null | undefined): number {
  if (!status) return 0;
  return ORDER_STATUS_PROGRESS[status as OrderStatusKey] ?? 0;
}

/** Timeline index for a live status; -1 when the order is cancelled/rejected. */
export function orderTimelineIndex(status: string | null | undefined): number {
  switch (status) {
    case "pending":
    case "approved":
      return 0;
    case "assigned":
    case "accepted":
      return 1;
    case "on_the_way":
      return 2;
    case "arrived":
      return 3;
    case "delivering":
      return 4;
    case "payment_collected":
    case "completed":
      return 5;
    default:
      return -1;
  }
}
