import type { BookingStatus } from "@/lib/bookings";

export type BookingView = {
  id: string;
  status: BookingStatus;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  description: string | null;
  serviceTitle: string | null;
  customEntries: { label: string; value: string }[];
  startTimeIso: string | null;
  startDayKey: string | null;
  startLabel: string | null;
  proposedStartValue: string | null;
  durationMinutes: number | null;
  depositAmount: number | null;
  priceMinor: number | null;
  servicePriceMinor: number | null;
  serviceDepositMinor: number | null;
  invoiceNumber: string | null;
  depositExpiresLabel: string | null;
  reminderSent: boolean;
  googleLinked: boolean;
  assetCount: number;
  defaultDepositCents: number;
  qrAvailable: boolean;
  cardAvailable: boolean;
  paymentMethod: "stripe" | "qr" | null;
};

export const STATUS_BADGE: Record<
  BookingStatus,
  "default" | "secondary" | "outline" | "ghost"
> = {
  pending_review: "default",
  deposit_pending: "outline",
  confirmed: "secondary",
  completed: "secondary",
  rejected: "ghost",
  expired: "ghost",
  cancelled: "ghost",
};

export const TIMELINE_STEPS = [
  "Poptávka",
  "Schválení",
  "Záloha",
  "Splněno",
] as const;

export function timelineDone(status: BookingStatus): number {
  if (status === "pending_review") return 1;
  if (status === "deposit_pending") return 2;
  if (status === "confirmed") return 3;
  if (status === "completed") return 4;
  return 0;
}
