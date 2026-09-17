export type BookingStatus =
  | "pending_review"
  | "deposit_pending"
  | "confirmed"
  | "rejected"
  | "completed"
  | "cancelled"
  | "expired";

export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_review: ["deposit_pending", "confirmed", "rejected"],
  deposit_pending: ["confirmed", "expired", "cancelled", "rejected"],
  confirmed: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: [],
  expired: [],
};

export function canTransition(
  from: BookingStatus,
  to: BookingStatus
): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

export const SLOT_BLOCKING_STATUSES = [
  "deposit_pending",
  "confirmed",
] as const;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_review: "Čeká na schválení",
  deposit_pending: "Čeká na zálohu",
  confirmed: "Potvrzeno",
  rejected: "Odmítnuto",
  completed: "Splněno",
  cancelled: "Zrušeno",
  expired: "Vypršelo",
};
