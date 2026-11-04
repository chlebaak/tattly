"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, profiles, services } from "@/db/schema";
import { logBookingEvent } from "@/lib/booking-events";
import { appUrl } from "@/lib/env";
import {
  clientRequestEmailForArtist,
  depositMarkedPaidEmailForArtist,
  sendEmail,
} from "@/lib/email";

/** Klient označí, že platbu odeslal – tatér dostane vědět. */
export async function markDepositSent(
  bookingId: unknown
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.uuid().safeParse(bookingId);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({
      booking: bookings,
      artistEmail: profiles.email,
      artistName: profiles.displayName,
      timezone: profiles.timezone,
      currency: profiles.currency,
      bookingTitle: bookings.serviceTitle,
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

  await db
    .update(bookings)
    .set({ clientPaidAt: new Date() })
    .where(eq(bookings.id, booking.id));

  await logBookingEvent({
    bookingId: booking.id,
    type: "deposit_marked_paid",
    actor: "client",
    meta: { amount: booking.depositAmount },
  });

  const email = depositMarkedPaidEmailForArtist({
    artistName: row.artistName,
    clientName: booking.clientName,
    serviceTitle: row.bookingTitle ?? row.serviceTitle ?? "Termín",
    when: booking.startTime,
    timezone: row.timezone,
    amountMinor: booking.depositAmount ?? 0,
    currency: row.currency,
    variableSymbol: booking.variableSymbol,
    bookingUrl: `${appUrl()}/dashboard`,
  });
  await sendEmail({
    to: row.artistEmail,
    subject: email.subject,
    html: email.html,
  });

  return { ok: true };
}

const requestSchema = z.object({
  code: z.string().min(4).max(16),
  kind: z.enum(["reschedule", "cancel", "question"]),
  message: z.string().max(300).optional(),
});

/** Strukturovaný požadavek klienta (přesun / storno / dotaz). */
export async function submitClientRequest(input: unknown): Promise<{
  ok: boolean;
  error?: string;
}> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const code = parsed.data.code.trim().toUpperCase();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.statusCode, code))
    .limit(1);
  if (!booking) return { ok: false, error: "NOT_FOUND" };
  if (
    booking.status !== "pending_review" &&
    booking.status !== "deposit_pending" &&
    booking.status !== "confirmed"
  ) {
    return { ok: false, error: "INVALID_STATE" };
  }

  const message = parsed.data.message?.trim() || undefined;
  const openRequest = {
    kind: parsed.data.kind,
    message,
    createdAt: new Date().toISOString(),
  };

  await db
    .update(bookings)
    .set({ openRequest })
    .where(eq(bookings.id, booking.id));

  await logBookingEvent({
    bookingId: booking.id,
    type: "request",
    actor: "client",
    message,
    meta: { kind: parsed.data.kind },
  });

  // Tatér musí o požadavku vědět i mimo dashboard – posíláme mu e-mail
  // s odpovědí přímo klientovi (reply-to).
  const [artist] = await db
    .select({
      email: profiles.email,
      displayName: profiles.displayName,
      timezone: profiles.timezone,
      bookingTitle: bookings.serviceTitle,
      serviceTitle: services.title,
    })
    .from(bookings)
    .innerJoin(profiles, eq(bookings.profileId, profiles.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, booking.id))
    .limit(1);
  if (artist) {
    const email = clientRequestEmailForArtist({
      artistName: artist.displayName,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      kind: parsed.data.kind,
      message,
      serviceTitle: artist.bookingTitle ?? artist.serviceTitle ?? "Rezervace",
      when: booking.startTime,
      timezone: artist.timezone,
      bookingUrl: `${appUrl()}/dashboard`,
    });
    await sendEmail({
      to: artist.email,
      subject: email.subject,
      html: email.html,
      replyTo: booking.clientEmail,
    });
  }

  return { ok: true };
}

const ibanSchema = z.object({
  code: z.string().min(4).max(16),
  iban: z
    .string()
    .min(15)
    .max(34)
    .regex(/^[A-Za-z]{2}[0-9A-Za-z ]{13,32}$/),
});

/** Klient doplní IBAN pro vrácení zálohy. */
export async function submitRefundIban(input: unknown): Promise<{
  ok: boolean;
  error?: string;
}> {
  const parsed = ibanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const code = parsed.data.code.trim().toUpperCase();
  const iban = parsed.data.iban.replace(/\s+/g, "").toUpperCase();

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.statusCode, code))
    .limit(1);
  if (!booking) return { ok: false, error: "NOT_FOUND" };
  if (booking.status !== "cancelled") {
    return { ok: false, error: "INVALID_STATE" };
  }

  await db
    .update(bookings)
    .set({ clientIban: iban })
    .where(eq(bookings.id, booking.id));

  await logBookingEvent({
    bookingId: booking.id,
    type: "request",
    actor: "client",
    message: `Číslo účtu pro vrácení zálohy: ${iban}`,
    meta: { kind: "refund_iban" },
  });

  return { ok: true };
}

