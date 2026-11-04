import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, profiles, services } from "@/db/schema";
import { onBookingConfirmed } from "@/lib/booking-flow";
import { logBookingEvent } from "@/lib/booking-events";
import { refundSentEmailForClient, sendEmail } from "@/lib/email";

/**
 * Potvrdí přijatou zálohu (ručně od tatéra, QR nebo automaticky z banky).
 * Sdílené pro serverové akce i bankovní synchronizaci.
 */
export async function confirmDepositPaid(params: {
  profileId: string;
  bookingId: string;
  method: "qr" | "bank";
}): Promise<{ ok: boolean; error?: string }> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, params.profileId))
    .limit(1);
  if (!profile) return { ok: false, error: "NOT_FOUND" };

  const [row] = await db
    .select({
      booking: bookings,
      serviceTitle: services.title,
      serviceDuration: services.durationMinutes,
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, params.bookingId))
    .limit(1);
  const booking = row?.booking;
  if (!row || !booking) return { ok: false, error: "NOT_FOUND" };
  if (booking.profileId !== params.profileId) {
    return { ok: false, error: "NOT_FOUND" };
  }
  if (booking.status !== "deposit_pending") {
    return { ok: false, error: "INVALID_STATE" };
  }

  let moved: {
    startTime: Date | null;
    endTime: Date | null;
    priceMinor: number | null;
    depositAmount: number | null;
  };
  try {
    moved = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${profile.id}::text, 0))`
      );
      const [locked] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, booking.id))
        .for("update")
        .limit(1);
      if (!locked || locked.status !== "deposit_pending") {
        throw new Error("INVALID_STATE");
      }
      await tx
        .update(bookings)
        .set({ status: "confirmed" })
        .where(eq(bookings.id, booking.id));
      await tx
        .update(payments)
        .set({ method: params.method, status: "succeeded", paidAt: new Date() })
        .where(
          and(
            eq(payments.bookingId, booking.id),
            eq(payments.status, "pending")
          )
        );
      return {
        startTime: locked.startTime,
        endTime: locked.endTime,
        priceMinor: locked.priceMinor,
        depositAmount: locked.depositAmount,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_STATE") {
      return { ok: false, error: "INVALID_STATE" };
    }
    console.error("Deposit confirm failed", error);
    return { ok: false, error: "UNKNOWN" };
  }

  if (!moved.startTime || !moved.endTime) {
    return { ok: false, error: "INVALID_STATE" };
  }

  await onBookingConfirmed({
    profile,
    bookingId: booking.id,
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    description: booking.description,
    startTime: moved.startTime,
    endTime: moved.endTime,
    serviceTitle: booking.serviceTitle ?? row.serviceTitle,
    serviceDurationMinutes: row.serviceDuration,
    priceMinor: moved.priceMinor,
    depositAmount: moved.depositAmount,
  });

  await logBookingEvent({
    bookingId: booking.id,
    type: "deposit_paid",
    actor: params.method === "bank" ? "system" : "artist",
    meta: { amount: moved.depositAmount, method: params.method },
  });
  await logBookingEvent({
    bookingId: booking.id,
    type: "confirmed",
    actor: "system",
  });

  return { ok: true };
}

/**
 * Označí vrácení zálohy (ručně od tatéra, nebo automaticky podle odchozí platby).
 */
export async function markDepositRefunded(params: {
  profileId: string;
  bookingId: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const [profile] = await db
    .select({ displayName: profiles.displayName, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, params.profileId))
    .limit(1);
  if (!profile) return { ok: false, error: "NOT_FOUND" };

  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.id, params.bookingId),
        eq(bookings.profileId, params.profileId)
      )
    )
    .limit(1);
  if (!booking) return { ok: false, error: "NOT_FOUND" };

  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.bookingId, booking.id),
        eq(payments.status, "succeeded")
      )
    )
    .limit(1);
  if (!payment) return { ok: false, error: "NO_PAYMENT" };

  await db
    .update(payments)
    .set({
      status: "refunded",
      refundedAt: new Date(),
      refundNote: params.note?.trim() || null,
    })
    .where(eq(payments.id, payment.id));

  await logBookingEvent({
    bookingId: booking.id,
    type: "refunded",
    actor: "artist",
    message: params.note?.trim() || undefined,
    meta: { amount: payment.amount },
  });

  const email = refundSentEmailForClient({
    clientName: booking.clientName,
    artistName: profile.displayName,
    amountMinor: payment.amount,
    currency: payment.currency,
    iban: booking.clientIban,
  });
  await sendEmail({
    to: booking.clientEmail,
    subject: email.subject,
    html: email.html,
    replyTo: profile.email,
  });

  return { ok: true };
}
