"use server";

import { z } from "zod";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  bankConnections,
  bankTransactions,
  bookingAssets,
  bookings,
  payments,
  profiles,
  services,
  type Booking,
  type Profile,
} from "@/db/schema";
import { requireProfile } from "@/lib/session";
import { canTransition } from "@/lib/bookings";
import { assetsPurgeAfterFor } from "@/lib/booking-lifecycle";
import { getDaySlots } from "@/lib/availability";
import { resolveSlotInterval } from "@/lib/slots";
import { logBookingEvent, variableSymbolForBooking } from "@/lib/booking-events";
import {
  confirmDepositPaid,
  markDepositRefunded,
} from "@/lib/booking-payments";
import { onBookingConfirmed } from "@/lib/booking-flow";
import { createPresignedRead } from "@/lib/r2";
import { buildDepositQr } from "@/lib/payments";
import {
  bookingCancelledEmailForClient,
  bookingRejectedEmailForClient,
  bookingRescheduledEmailForClient,
  depositLinkEmailForClient,
  invoiceEmailForClient,
  artistMessageEmailForClient,
  sendEmail,
} from "@/lib/email";
import { buildIcsAttachment } from "@/lib/calendar";
import { buildQrDataUri, buildSpaydString } from "@/lib/qr";
import {
  deleteCalendarEvent,
  googleAccessForProfile,
  updateCalendarEvent,
} from "@/lib/google";
import {
  scheduleBookingReminder,
  scheduleDepositExpiry,
} from "@/inngest/client";
import { appUrl } from "@/lib/env";

const approveSchema = z.object({
  bookingId: z.uuid(),
  startIso: z.iso.datetime(),
  depositCzk: z.number().int().min(0).max(1_000_000).optional(),
  priceCzk: z.number().int().min(0).max(10_000_000).optional(),
});

const rejectSchema = z.object({
  bookingId: z.uuid(),
});

const cancelSchema = z.object({
  bookingId: z.uuid(),
  refund: z.boolean(),
});

const rescheduleSchema = z.object({
  bookingId: z.uuid(),
  startIso: z.iso.datetime(),
  durationMinutes: z.number().int().min(15).max(720),
});

export async function rescheduleBooking(input: {
  bookingId: string;
  startIso: string;
  durationMinutes: number;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({ booking: bookings, serviceTitle: services.title })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .limit(1);
  const booking = row?.booking;
  if (!row || !booking) return { ok: false, error: "NOT_FOUND" };
  if (booking.status !== "deposit_pending" && booking.status !== "confirmed") {
    return { ok: false, error: "INVALID_STATE" };
  }
  if (!booking.startTime) return { ok: false, error: "INVALID_STATE" };

  const start = new Date(parsed.data.startIso);
  if (start <= new Date()) return { ok: false, error: "PAST" };
  const end = addMinutes(start, parsed.data.durationMinutes);

  let moved: { startTime: Date; googleEventId: string | null; status: string } | null =
    null;
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
      if (
        !locked ||
        (locked.status !== "deposit_pending" && locked.status !== "confirmed")
      ) {
        throw new Error("INVALID_STATE");
      }
      const clash = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.profileId, profile.id),
            inArray(bookings.status, ["deposit_pending", "confirmed"]),
            ne(bookings.id, booking.id),
            sql`tstzrange(${bookings.startTime}, ${bookings.endTime}, '[)') && tstzrange(${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz, '[)')`
          )
        )
        .limit(1);
      if (clash.length) throw new Error("SLOT_TAKEN");

      await tx
        .update(bookings)
        .set({ startTime: start, endTime: end })
        .where(eq(bookings.id, booking.id));
      return {
        startTime: start,
        googleEventId: locked.googleEventId,
        status: locked.status,
      };
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "SLOT_TAKEN" || error.message === "INVALID_STATE")
    ) {
      return { ok: false, error: error.message };
    }
    console.error("Reschedule transaction failed", error);
    return { ok: false, error: "UNKNOWN" };
  }

  if (moved.status === "confirmed" && moved.googleEventId) {
    const accessToken = await googleAccessForProfile(profile);
    if (accessToken && profile.googleCalendarId) {
      try {
        await updateCalendarEvent({
          accessToken,
          calendarId: profile.googleCalendarId,
          eventId: moved.googleEventId,
          artistName: profile.displayName,
          serviceTitle: row.booking.serviceTitle ?? row.serviceTitle ?? "Rezervace",
          start,
          end,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          description: booking.description,
          bookingUrl: `${appUrl()}/dashboard`,
        });
      } catch (error) {
        console.error("Google calendar update failed", error);
      }
    }
    const remindAt = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    if (remindAt > new Date()) {
      await scheduleBookingReminder(booking.id, remindAt);
    }
  }

  const ics = await buildIcsAttachment({
    uid: booking.id,
    title: `${row.booking.serviceTitle ?? row.serviceTitle ?? "Termín"} – ${profile.displayName}`,
    start,
    durationMinutes: parsed.data.durationMinutes,
    description: booking.description,
    organizerName: profile.displayName,
    organizerEmail: profile.email,
    attendeeName: booking.clientName,
    attendeeEmail: booking.clientEmail,
  });
  const email = bookingRescheduledEmailForClient({
    clientName: booking.clientName,
    artistName: profile.displayName,
    serviceTitle: row.booking.serviceTitle ?? row.serviceTitle ?? "Termín",
    oldWhen: booking.startTime,
    newWhen: start,
    timezone: profile.timezone,
  });
  await sendEmail({
    to: booking.clientEmail,
    subject: email.subject,
    html: email.html,
    attachments: ics ? [ics] : undefined,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  return { ok: true };
}

export async function approveBookingAction(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({
      booking: bookings,
      serviceDuration: services.durationMinutes,
      serviceTitle: services.title,
      servicePriceMinor: services.priceMinor,
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .limit(1);
  const booking = row?.booking;
  if (!row || !booking) return { ok: false, error: "NOT_FOUND" };
  if (booking.status !== "pending_review") {
    return { ok: false, error: "INVALID_STATE" };
  }

  const start = new Date(parsed.data.startIso);
  const end = addMinutes(start, row.serviceDuration ?? 60);
  const requestedDeposit =
    parsed.data.depositCzk !== undefined
      ? parsed.data.depositCzk * 100
      : profile.defaultDepositAmount;
  // Bez bankovního účtu není kam zálohu poslat – rezervace se potvrdí rovnou.
  const depositAmount = profile.bankAccount ? requestedDeposit : 0;
  const priceMinor =
    parsed.data.priceCzk !== undefined
      ? parsed.data.priceCzk * 100
      : (row.servicePriceMinor ?? null);

  if (depositAmount === 0) {
    try {
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${profile.id}::text, 0))`
        );
        const [locked] = await tx
          .select({ status: bookings.status })
          .from(bookings)
          .where(eq(bookings.id, booking.id))
          .for("update")
          .limit(1);
        if (!locked || locked.status !== "pending_review") {
          throw new Error("INVALID_STATE");
        }
        const clash = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.profileId, profile.id),
              inArray(bookings.status, ["deposit_pending", "confirmed"]),
              sql`tstzrange(${bookings.startTime}, ${bookings.endTime}, '[)') && tstzrange(${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz, '[)')`
            )
          )
          .limit(1);
        if (clash.length) throw new Error("SLOT_TAKEN");

        await tx
          .update(bookings)
          .set({
            status: "confirmed",
            startTime: start,
            endTime: end,
            depositAmount: 0,
            priceMinor,
          })
          .where(eq(bookings.id, booking.id));
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "SLOT_TAKEN" || error.message === "INVALID_STATE")
      ) {
        return { ok: false, error: error.message };
      }
      console.error("Approve (no deposit) failed", error);
      return { ok: false, error: "UNKNOWN" };
    }

    await onBookingConfirmed({
      profile,
      bookingId: booking.id,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      description: booking.description,
      startTime: start,
      endTime: end,
      serviceTitle: row.booking.serviceTitle ?? row.serviceTitle,
      serviceDurationMinutes: row.serviceDuration,
      priceMinor,
      depositAmount: 0,
    });

    await logBookingEvent({
      bookingId: booking.id,
      type: "approved",
      actor: "artist",
      meta: { depositAmount: 0 },
    });
    await logBookingEvent({
      bookingId: booking.id,
      type: "confirmed",
      actor: "system",
      meta: { withoutDeposit: true },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/calendar");
    return { ok: true };
  }

  const depositExpiresAt = addMinutes(new Date(), 24 * 60);
  const variableSymbol = variableSymbolForBooking(booking.id);

  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${profile.id}::text, 0))`
      );

      const [locked] = await tx
        .select({ status: bookings.status })
        .from(bookings)
        .where(eq(bookings.id, booking.id))
        .for("update")
        .limit(1);
      if (!locked || locked.status !== "pending_review") {
        throw new Error("INVALID_STATE");
      }

      const clash = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.profileId, profile.id),
            inArray(bookings.status, ["deposit_pending", "confirmed"]),
            sql`tstzrange(${bookings.startTime}, ${bookings.endTime}, '[)') && tstzrange(${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz, '[)')`
          )
        )
        .limit(1);
      if (clash.length) throw new Error("SLOT_TAKEN");

      await tx
        .update(bookings)
        .set({
          status: "deposit_pending",
          startTime: start,
          endTime: end,
          depositAmount,
          depositExpiresAt,
          variableSymbol,
          priceMinor,
        })
        .where(eq(bookings.id, booking.id));

      await tx.insert(payments).values({
        bookingId: booking.id,
        amount: depositAmount,
        currency: profile.currency,
        status: "pending",
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "SLOT_TAKEN" || error.message === "INVALID_STATE")
    ) {
      return { ok: false, error: error.message };
    }
    console.error("Approve transaction failed", error);
    return { ok: false, error: "UNKNOWN" };
  }

  try {
    const qr = profile.bankAccount
      ? await buildDepositQr({
          iban: profile.bankAccount,
          amountMinor: depositAmount,
          currency: profile.currency,
          variableSymbol,
          artistName: profile.displayName,
        })
      : null;
    const email = depositLinkEmailForClient({
      clientName: booking.clientName,
      artistName: profile.displayName,
      serviceTitle: row.booking.serviceTitle ?? row.serviceTitle ?? "Termín",
      amountMinor: depositAmount,
      currency: profile.currency,
      payUrl: `${appUrl()}/pay/${booking.id}`,
      statusUrl: booking.statusCode
        ? `${appUrl()}/booking/status?code=${booking.statusCode}`
        : null,
      expiresAt: depositExpiresAt,
      timezone: profile.timezone,
      qrDataUri: qr?.dataUri ?? null,
      variableSymbol,
      iban: profile.bankAccount,
    });
    await sendEmail({
      to: booking.clientEmail,
      subject: email.subject,
      html: email.html,
      replyTo: profile.email,
    });
  } catch (error) {
    console.error("Deposit request failed", error);
    await db.transaction(async (tx) => {
      await tx
        .delete(payments)
        .where(
          and(
            eq(payments.bookingId, booking.id),
            eq(payments.status, "pending")
          )
        );
      await tx
        .update(bookings)
        .set({
          status: "pending_review",
          depositAmount: null,
          depositExpiresAt: null,
          variableSymbol: null,
        })
        .where(
          and(
            eq(bookings.id, booking.id),
            eq(bookings.status, "deposit_pending")
          )
        );
    });
    return { ok: false, error: "UNKNOWN" };
  }

  await scheduleDepositExpiry(booking.id, depositExpiresAt);

  await logBookingEvent({
    bookingId: booking.id,
    type: "approved",
    actor: "artist",
    meta: { depositAmount },
  });
  await logBookingEvent({
    bookingId: booking.id,
    type: "deposit_sent",
    actor: "system",
    meta: { depositAmount, variableSymbol },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function confirmQrPayment(input: {
  bookingId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z.object({ bookingId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const result = await confirmDepositPaid({
    profileId: profile.id,
    bookingId: parsed.data.bookingId,
    method: "qr",
  });
  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/calendar");
  }
  return result;
}

export async function getBookingAssets(input: {
  bookingId: string;
}): Promise<{ ok: boolean; urls?: string[] }> {
  const profile = await requireProfile();
  const parsed = z.object({ bookingId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false };

  const [booking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .limit(1);
  if (!booking) return { ok: false };

  const rows = await db
    .select({ storagePath: bookingAssets.storagePath })
    .from(bookingAssets)
    .where(eq(bookingAssets.bookingId, booking.id))
    .limit(12);
  const urls = (
    await Promise.all(
      rows.map((a) => createPresignedRead(a.storagePath).catch(() => null))
    )
  ).filter((u): u is string => u !== null);
  return { ok: true, urls };
}

export async function rejectBookingAction(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .limit(1);
  if (!booking || !canTransition(booking.status, "rejected")) {
    return { ok: false, error: "INVALID_STATE" };
  }

  await db
    .update(bookings)
    .set({
      status: "rejected",
      assetsPurgeAfter: assetsPurgeAfterFor("rejected", booking.createdAt),
    })
    .where(eq(bookings.id, booking.id));

  const email = bookingRejectedEmailForClient({
    clientName: booking.clientName,
    artistName: profile.displayName,
  });
  await sendEmail({
    to: booking.clientEmail,
    subject: email.subject,
    html: email.html,
    replyTo: profile.email,
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cancelBooking(input: {
  bookingId: string;
  refund: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .limit(1);
  if (!booking || !canTransition(booking.status, "cancelled")) {
    return { ok: false, error: "INVALID_STATE" };
  }

  const updated = await db
    .update(bookings)
    .set({
      status: "cancelled",
      assetsPurgeAfter: assetsPurgeAfterFor("cancelled", booking.createdAt),
    })
    .where(and(eq(bookings.id, booking.id), eq(bookings.status, booking.status)))
    .returning({ id: bookings.id });
  if (!updated.length) return { ok: false, error: "INVALID_STATE" };

  let refundKind: "bank" | "none" = "none";
  if (parsed.data.refund) {
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
    if (payment) {
      refundKind = "bank";
      await logBookingEvent({
        bookingId: booking.id,
        type: "refund_requested",
        actor: "artist",
        meta: { amount: payment.amount, currency: payment.currency },
      });
    }
  }

  await logBookingEvent({
    bookingId: booking.id,
    type: "cancelled",
    actor: "artist",
    meta: { refund: refundKind },
  });

  const googleToken = await googleAccessForProfile(profile);
  if (booking.googleEventId && googleToken && profile.googleCalendarId) {
    try {
      await deleteCalendarEvent({
        accessToken: googleToken,
        calendarId: profile.googleCalendarId,
        eventId: booking.googleEventId,
      });
      await db
        .update(bookings)
        .set({ googleEventId: null })
        .where(eq(bookings.id, booking.id));
    } catch (error) {
      console.error("Google calendar event delete failed", error);
    }
  }

  const [row] = await db
    .select({ serviceTitle: bookings.serviceTitle })
    .from(bookings)
    .where(eq(bookings.id, booking.id))
    .limit(1);
  if (booking.startTime) {
    const email = bookingCancelledEmailForClient({
      clientName: booking.clientName,
      artistName: profile.displayName,
      serviceTitle: row?.serviceTitle ?? "Termín",
      when: booking.startTime,
      timezone: profile.timezone,
      refundKind,
      hadDeposit: (booking.depositAmount ?? 0) > 0,
      statusUrl: booking.statusCode
        ? `${appUrl()}/booking/status?code=${booking.statusCode}`
        : null,
    });
    await sendEmail({
      to: booking.clientEmail,
      subject: email.subject,
      html: email.html,
      replyTo: profile.email,
    });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function completeBooking(input: {
  bookingId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z.object({ bookingId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({ booking: bookings, serviceTitle: services.title })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .limit(1);
  const booking = row?.booking;
  if (!row || !booking || !canTransition(booking.status, "completed")) {
    return { ok: false, error: "INVALID_STATE" };
  }

  const updated = await db
    .update(bookings)
    .set({
      status: "completed",
      assetsPurgeAfter: assetsPurgeAfterFor("completed", booking.createdAt),
    })
    .where(and(eq(bookings.id, booking.id), eq(bookings.status, booking.status)))
    .returning({ id: bookings.id });
  if (!updated.length) return { ok: false, error: "INVALID_STATE" };

  if (
    booking.priceMinor &&
    booking.priceMinor > 0 &&
    !booking.invoiceNumber
  ) {
    try {
      await issueInvoice({
        profile,
        bookingId: booking.id,
        invoiceCounter: profile.invoiceCounter,
      });
    } catch (error) {
      console.error("Invoice issuance failed", error);
    }
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

async function issueInvoice(params: {
  profile: Profile;
  bookingId: string;
  invoiceCounter: number;
}): Promise<void> {
  const { profile } = params;
  const [booked] = await db
    .select({ booking: bookings, serviceTitle: services.title })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, params.bookingId))
    .limit(1);
  if (!booked || !booked.booking.priceMinor || booked.booking.priceMinor <= 0) {
    return;
  }
  if (booked.booking.invoiceNumber) return;

  const year = new Date().getFullYear();
  const [counterRow] = await db
    .update(profiles)
    .set({ invoiceCounter: sql`${profiles.invoiceCounter} + 1` })
    .where(eq(profiles.id, profile.id))
    .returning({ counter: profiles.invoiceCounter });
  const counter = counterRow?.counter ?? params.invoiceCounter;
  const invoiceNumber = `${year}${String(counter).padStart(3, "0")}`;

  const claimed = await db
    .update(bookings)
    .set({ invoiceNumber, invoicedAt: new Date() })
    .where(and(eq(bookings.id, params.bookingId), isNull(bookings.invoiceNumber)))
    .returning({ id: bookings.id });
  if (!claimed.length) return;

  await sendInvoiceEmail({
    profile,
    booking: booked.booking,
    serviceTitle: booked.booking.serviceTitle ?? booked.serviceTitle,
    invoiceNumber,
  });
}

async function sendInvoiceEmail(params: {
  profile: Profile;
  booking: Booking;
  serviceTitle: string | null;
  invoiceNumber: string;
}): Promise<void> {
  const { profile, booking } = params;
  if (!booking.priceMinor || booking.priceMinor <= 0) return;

  const addressText = [
    profile.addressLine,
    `${profile.city ?? ""}${profile.zip ? ` ${profile.zip}` : ""}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const qrDataUri = profile.bankAccount
    ? await buildQrDataUri(
        buildSpaydString({
          iban: profile.bankAccount,
          amountMinor: booking.priceMinor,
          currency: profile.currency,
          variableSymbol: params.invoiceNumber,
          message: `Faktura ${params.invoiceNumber}`,
        })
      )
    : null;

  const email = invoiceEmailForClient({
    clientName: booking.clientName,
    invoiceNumber: params.invoiceNumber,
    supplierName: profile.displayName,
    supplierStudio: profile.studioName,
    supplierAddress: addressText || "—",
    supplierIco: profile.ico,
    supplierDic: profile.dic,
    serviceTitle: params.serviceTitle ?? "Služba",
    serviceDate: booking.startTime ?? new Date(),
    timezone: profile.timezone,
    amountMinor: booking.priceMinor,
    currency: profile.currency,
    bankAccount: profile.bankAccount,
    qrDataUri,
    appUrl: appUrl(),
  });
  await sendEmail({
    to: booking.clientEmail,
    subject: email.subject,
    html: email.html,
  });
}

export async function resendInvoice(input: {
  bookingId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z.object({ bookingId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({ booking: bookings, serviceTitle: services.title })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .limit(1);
  const booking = row?.booking;
  if (!row || !booking || !booking.invoiceNumber) {
    return { ok: false, error: "NOT_INVOICED" };
  }

  await sendInvoiceEmail({
    profile,
    booking,
    serviceTitle: row.booking.serviceTitle ?? row.serviceTitle,
    invoiceNumber: booking.invoiceNumber,
  });
  return { ok: true };
}

const suggestedSlotsSchema = z.object({
  bookingId: z.uuid(),
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Volné termíny pro daný den – používané v dialogu pro schválení a přesun.
 * Ignoruje minimální lhůtu (schvaluje tatér) a vlastní termín rezervace.
 */
export async function getSuggestedSlots(input: unknown): Promise<
  | { ok: true; slots: { iso: string; label: string }[] }
  | { ok: false; error: string }
> {
  const profile = await requireProfile();
  const parsed = suggestedSlotsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({
      booking: bookings,
      serviceDuration: services.durationMinutes,
      serviceSlotInterval: services.slotIntervalMinutes,
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .limit(1);
  if (!row) return { ok: false, error: "NOT_FOUND" };

  const durationMinutes =
    row.booking.startTime && row.booking.endTime
      ? Math.max(
          15,
          Math.round(
            (row.booking.endTime.getTime() - row.booking.startTime.getTime()) /
              60000
          )
        )
      : (row.serviceDuration ?? 60);

  const tz = profile.timezone || "Europe/Prague";
  const slots = await getDaySlots({
    profileId: profile.id,
    dayKey: parsed.data.dayKey,
    timezone: tz,
    durationMinutes,
    intervalMinutes: resolveSlotInterval(profile.bookingRules, {
      durationMinutes: row.serviceDuration ?? durationMinutes,
      slotIntervalMinutes: row.serviceSlotInterval,
    }),
    excludeBookingId: parsed.data.bookingId,
  });

  return {
    ok: true,
    slots: slots.map((slot) => ({
      iso: slot.start.toISOString(),
      label: formatInTimeZone(slot.start, tz, "HH:mm"),
    })),
  };
}

const notesSchema = z.object({
  bookingId: z.uuid(),
  notes: z.string().max(4000),
});

export async function saveBookingNotes(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const updated = await db
    .update(bookings)
    .set({ notes: parsed.data.notes.trim() || null })
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .returning({ id: bookings.id });
  if (updated.length === 0) return { ok: false, error: "NOT_FOUND" };

  revalidatePath("/dashboard");
  return { ok: true };
}

const approveManySchema = z.object({
  bookingIds: z.array(z.uuid()).min(1).max(50),
});

/**
 * Hromadné schválení: použije požadovaný termín klienta a výchozí zálohu
 * ze služby. Rezervace bez navrženého termínu se přeskočí.
 */
export async function approveManyBookingsAction(input: unknown): Promise<{
  ok: boolean;
  approved: number;
  skipped: number;
  error?: string;
}> {
  const profile = await requireProfile();
  const parsed = approveManySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, approved: 0, skipped: 0, error: "INVALID_INPUT" };
  }

  let approved = 0;
  let skipped = 0;
  let lastError: string | undefined;

  for (const bookingId of parsed.data.bookingIds) {
    const [row] = await db
      .select({
        booking: bookings,
        serviceDepositMinor: services.depositMinor,
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(
        and(eq(bookings.id, bookingId), eq(bookings.profileId, profile.id))
      )
      .limit(1);

    if (
      !row ||
      row.booking.status !== "pending_review" ||
      !row.booking.startTime
    ) {
      skipped += 1;
      continue;
    }

    const result = await approveBookingAction({
      bookingId,
      startIso: row.booking.startTime.toISOString(),
      depositCzk:
        row.serviceDepositMinor !== null
          ? Math.round(row.serviceDepositMinor / 100)
          : undefined,
    });
    if (result.ok) {
      approved += 1;
    } else {
      skipped += 1;
      lastError = result.error;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  return { ok: approved > 0, approved, skipped, error: lastError };
}

/* ------------------------------ refundace (ručně) ------------------------------ */

export async function markRefunded(input: {
  bookingId: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z
    .object({ bookingId: z.uuid(), note: z.string().max(300).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const result = await markDepositRefunded({
    profileId: profile.id,
    bookingId: parsed.data.bookingId,
    note: parsed.data.note,
  });
  if (result.ok) revalidatePath("/dashboard");
  return result;
}

/* ----------------------------- komunikace s klientem ---------------------------- */

export async function sendClientMessage(input: {
  bookingId: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z
    .object({ bookingId: z.uuid(), message: z.string().min(2).max(300) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({ booking: bookings, serviceTitle: services.title })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .limit(1);
  const booking = row?.booking;
  if (!row || !booking) return { ok: false, error: "NOT_FOUND" };
  if (!booking.startTime) return { ok: false, error: "INVALID_STATE" };

  const message = parsed.data.message.trim();
  await logBookingEvent({
    bookingId: booking.id,
    type: "message",
    actor: "artist",
    message,
  });

  const email = artistMessageEmailForClient({
    clientName: booking.clientName,
    artistName: profile.displayName,
    serviceTitle: row.booking.serviceTitle ?? row.serviceTitle ?? "Termín",
    when: booking.startTime,
    timezone: profile.timezone,
    message,
    statusUrl: booking.statusCode
      ? `${appUrl()}/booking/status?code=${booking.statusCode}`
      : null,
  });
  await sendEmail({
    to: booking.clientEmail,
    subject: email.subject,
    html: email.html,
    replyTo: profile.email,
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function resolveClientRequest(input: {
  bookingId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z.object({ bookingId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const updated = await db
    .update(bookings)
    .set({ openRequest: null })
    .where(
      and(
        eq(bookings.id, parsed.data.bookingId),
        eq(bookings.profileId, profile.id)
      )
    )
    .returning({ id: bookings.id });
  if (!updated.length) return { ok: false, error: "NOT_FOUND" };

  await logBookingEvent({
    bookingId: parsed.data.bookingId,
    type: "request_resolved",
    actor: "artist",
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

/* --------------------------- bankovní platby (Fio) --------------------------- */

const assignBankSchema = z.object({
  transactionId: z.uuid(),
  bookingId: z.uuid(),
});

/** Ruční přiřazení nespárované platby k rezervaci. */
export async function assignBankTransaction(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = assignBankSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({
      transaction: bankTransactions,
      connectionProfileId: bankConnections.profileId,
    })
    .from(bankTransactions)
    .innerJoin(
      bankConnections,
      eq(bankTransactions.connectionId, bankConnections.id)
    )
    .where(eq(bankTransactions.id, parsed.data.transactionId))
    .limit(1);
  if (!row || row.connectionProfileId !== profile.id) {
    return { ok: false, error: "NOT_FOUND" };
  }
  if (row.transaction.bookingId) return { ok: false, error: "ALREADY_MATCHED" };

  const result = await confirmDepositPaid({
    profileId: profile.id,
    bookingId: parsed.data.bookingId,
    method: "bank",
  });
  if (!result.ok) return result;

  await db
    .update(bankTransactions)
    .set({ bookingId: parsed.data.bookingId, matchedAt: new Date() })
    .where(eq(bankTransactions.id, row.transaction.id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  return { ok: true };
}
