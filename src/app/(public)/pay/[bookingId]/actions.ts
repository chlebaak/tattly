"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, profiles, services } from "@/db/schema";
import { createDepositCheckoutSession, getStripe } from "@/lib/stripe";

export async function startCardCheckout(
  bookingId: unknown
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const parsed = z.uuid().safeParse(bookingId);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({
      booking: bookings,
      currency: profiles.currency,
      stripeAccountId: profiles.stripeAccountId,
      serviceTitle: services.title,
    })
    .from(bookings)
    .innerJoin(profiles, eq(bookings.profileId, profiles.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, parsed.data))
    .limit(1);
  const booking = row?.booking;
  if (!row || !booking) return { ok: false, error: "NOT_FOUND" };
  if (booking.status !== "deposit_pending") {
    return { ok: false, error: "INVALID_STATE" };
  }
  if (!booking.depositAmount || booking.depositAmount <= 0) {
    return { ok: false, error: "INVALID_STATE" };
  }
  if (booking.depositExpiresAt && booking.depositExpiresAt < new Date()) {
    return { ok: false, error: "EXPIRED" };
  }
  if (!row.stripeAccountId) return { ok: false, error: "CARD_UNAVAILABLE" };

  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(eq(payments.bookingId, booking.id), eq(payments.status, "pending"))
    )
    .limit(1);
  if (!payment) return { ok: false, error: "INVALID_STATE" };

  const stripe = getStripe();
  try {
    if (payment.stripeSessionId) {
      const existing = await stripe.checkout.sessions.retrieve(
        payment.stripeSessionId
      );
      if (existing.status === "open" && existing.url) {
        return { ok: true, url: existing.url };
      }
    }
    const session = await createDepositCheckoutSession({
      profileStripeAccountId: row.stripeAccountId,
      currency: row.currency,
      amountMinor: booking.depositAmount,
      serviceTitle: row.serviceTitle ?? "Záloha",
      bookingId: booking.id,
      paymentId: payment.id,
      clientEmail: booking.clientEmail,
    });
    if (!session.url) return { ok: false, error: "STRIPE_ERROR" };
    await db
      .update(payments)
      .set({ stripeSessionId: session.id, method: "stripe" })
      .where(eq(payments.id, payment.id));
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("Card checkout failed", error);
    return { ok: false, error: "STRIPE_ERROR" };
  }
}
