import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, profiles, services } from "@/db/schema";
import { buildIcsAttachment } from "@/lib/calendar";
import { logBookingEvent } from "@/lib/booking-events";
import { assetsPurgeAfterFor } from "@/lib/booking-lifecycle";
import {
  depositExpiredEmailForClient,
  reminderEmailForClient,
  sendEmail,
} from "@/lib/email";

/**
 * Úlohy rezervačního cyklu volané z Inngestu (přesné události) i ze
 * záchranného cronu `booking-sweep` (kdyby se událost ztratila).
 * Obě jsou idempotentní – opakovaný běh nic nezdvojí.
 */

/** Vyprší nezaplacenou zálohu a upozorní klienta. Vrací true, když vypršela. */
export async function expireDueDeposit(bookingId: string): Promise<boolean> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return false;
  if (booking.status !== "deposit_pending") return false;
  if (!booking.depositExpiresAt || booking.depositExpiresAt > new Date()) {
    return false;
  }

  await db
    .update(bookings)
    .set({
      status: "expired",
      assetsPurgeAfter: assetsPurgeAfterFor("expired", booking.createdAt),
    })
    .where(eq(bookings.id, bookingId));

  const [row] = await db
    .select({
      booking: bookings,
      artistName: profiles.displayName,
      artistEmail: profiles.email,
    })
    .from(bookings)
    .innerJoin(profiles, eq(bookings.profileId, profiles.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (row) {
    const email = depositExpiredEmailForClient({
      clientName: row.booking.clientName,
      artistName: row.artistName,
    });
    await sendEmail({
      to: row.booking.clientEmail,
      subject: email.subject,
      html: email.html,
      replyTo: row.artistEmail ?? undefined,
    });
  }
  await logBookingEvent({
    bookingId,
    type: "expired",
    actor: "system",
    message: "Záloha nedorazila včas, rezervace vypršela.",
  });
  return true;
}

/** Pošle připomínku den předem. Vrací true, když byla odeslána. */
export async function sendDueReminder(bookingId: string): Promise<boolean> {
  const [row] = await db
    .select({
      booking: bookings,
      artistName: profiles.displayName,
      artistEmail: profiles.email,
      timezone: profiles.timezone,
      addressLine: profiles.addressLine,
      city: profiles.city,
      zip: profiles.zip,
      serviceTitle: services.title,
      serviceDurationMinutes: services.durationMinutes,
    })
    .from(bookings)
    .innerJoin(profiles, eq(bookings.profileId, profiles.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return false;
  const booking = row.booking;
  if (booking.status !== "confirmed") return false;
  if (booking.reminderSentAt || !booking.startTime) return false;
  const now = new Date();
  const windowStart = new Date(booking.startTime.getTime() - 24 * 60 * 60 * 1000);
  if (now < windowStart || now >= booking.startTime) return false;

  const ics = await buildIcsAttachment({
    uid: booking.id,
    title: `${booking.serviceTitle ?? row.serviceTitle ?? "Termín"} – ${row.artistName}`,
    start: booking.startTime,
    durationMinutes:
      row.serviceDurationMinutes ??
      (booking.endTime
        ? Math.round(
            (booking.endTime.getTime() - booking.startTime.getTime()) / 60000
          )
        : 60),
    description: booking.description,
    location: row.addressLine
      ? `${row.addressLine}, ${row.city ?? ""}${
          row.zip ? ` ${row.zip}` : ""
        }`.replace(/, $/, "")
      : null,
    organizerName: row.artistName,
    organizerEmail: row.artistEmail,
    attendeeName: booking.clientName,
    attendeeEmail: booking.clientEmail,
  });

  const email = reminderEmailForClient({
    clientName: booking.clientName,
    artistName: row.artistName,
    serviceTitle: booking.serviceTitle ?? row.serviceTitle ?? "Termín",
    when: booking.startTime,
    timezone: row.timezone,
    address: row.addressLine
      ? {
          addressLine: row.addressLine,
          city: row.city ?? "",
          zip: row.zip ?? "",
        }
      : null,
  });
  await sendEmail({
    to: booking.clientEmail,
    subject: email.subject,
    html: email.html,
    attachments: ics ? [ics] : undefined,
  });

  await db
    .update(bookings)
    .set({ reminderSentAt: new Date() })
    .where(eq(bookings.id, bookingId));
  await logBookingEvent({
    bookingId,
    type: "reminder",
    actor: "system",
    message: "Poslali jsme připomínku s adresou a termínem.",
  });
  return true;
}

/** Rezervace se zálohou po lhůtě (pro záchranný cron). */
export async function findDueDeposits(limit = 50): Promise<string[]> {
  const rows = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "deposit_pending"),
        lte(bookings.depositExpiresAt, new Date())
      )
    )
    .orderBy(bookings.depositExpiresAt)
    .limit(limit);
  return rows.map((row) => row.id);
}

/** Potvrzené rezervace, kterým se má poslat připomínka (do 24 h). */
export async function findDueReminders(limit = 50): Promise<string[]> {
  const now = new Date();
  const rows = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "confirmed"),
        isNull(bookings.reminderSentAt),
        gt(bookings.startTime, now),
        lte(bookings.startTime, new Date(now.getTime() + 24 * 60 * 60 * 1000))
      )
    )
    .orderBy(bookings.startTime)
    .limit(limit);
  return rows.map((row) => row.id);
}
