import { db } from "@/db";
import { bookingEvents, type BookingEventType } from "@/db/schema";

/**
 * Zapíše událost do časové osy rezervace. Nikdy nevyhazuje – logování
 * nesmí shodit samotný tok rezervace.
 */
export async function logBookingEvent(params: {
  bookingId: string;
  type: BookingEventType;
  actor?: "client" | "artist" | "system";
  message?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(bookingEvents).values({
      bookingId: params.bookingId,
      type: params.type,
      actor: params.actor ?? "system",
      message: params.message ?? null,
      meta: params.meta ?? null,
    });
  } catch (error) {
    console.error("logBookingEvent failed", error);
  }
}

export function variableSymbolForBooking(bookingId: string): string {
  const hex = bookingId.replace(/-/g, "").slice(0, 12);
  const num = parseInt(hex, 16) % 1_000_000_000;
  return String(num).padStart(9, "0");
}
