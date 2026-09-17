"use server";

import { z } from "zod";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
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
import { onBookingConfirmed } from "@/lib/booking-flow";
import { createPresignedRead } from "@/lib/r2";
import { getStripe } from "@/lib/stripe";
import { buildDepositQr } from "@/lib/payments";
import {
  bookingCancelledEmailForClient,
  bookingRejectedEmailForClient,
  bookingRescheduledEmailForClient,
  depositLinkEmailForClient,
  invoiceEmailForClient,
  sendEmail,
} from "@/lib/email";
import { buildIcsAttachment } from "@/lib/calendar";
import { buildQrDataUri, buildSpaydString } from "@/lib/qr";
import {
  deleteCalendarEvent,
  getAccessTokenForProfile,
  updateCalendarEvent,
} from "@/lib/google";
import { inngest } from "@/inngest/client";
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
    if (profile.googleRefreshToken && profile.googleCalendarId) {
      try {
        const accessToken = await getAccessTokenForProfile(
          profile.googleRefreshToken
        );
        await updateCalendarEvent({
          accessToken,
          calendarId: profile.googleCalendarId,
          eventId: moved.googleEventId,
          artistName: profile.displayName,
          serviceTitle: row.serviceTitle ?? "Rezervace",
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
      await inngest.send({
        name: "booking/remind",
        data: { bookingId: booking.id },
        ts: remindAt.getTime(),
      });
    }
  }

  const ics = await buildIcsAttachment({
    uid: booking.id,
    title: `${row.serviceTitle ?? "Termín"} – ${profile.displayName}`,
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
    serviceTitle: row.serviceTitle ?? "Termín",
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
  const depositAmount =
    parsed.data.depositCzk !== undefined
      ? parsed.data.depositCzk * 100
      : profile.defaultDepositAmount;
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
      serviceTitle: row.serviceTitle,
      serviceDurationMinutes: row.serviceDuration,
      priceMinor,
      depositAmount: 0,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/calendar");
    return { ok: true };
  }

  if (!profile.stripeAccountId && !profile.bankAccount) {
    return { ok: false, error: "NEEDS_PAYMENT_SETUP" };
  }

  const depositExpiresAt = addMinutes(new Date(), 24 * 60);

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
    await inngest.send({
      name: "deposit/expire",
      data: { bookingId: booking.id },
      ts: depositExpiresAt.getTime(),
    });
    const qr = profile.bankAccount
      ? await buildDepositQr({
          iban: profile.bankAccount,
          amountMinor: depositAmount,
          currency: profile.currency,
          bookingId: booking.id,
          artistName: profile.displayName,
        })
      : null;
    const email = depositLinkEmailForClient({
      clientName: booking.clientName,
      artistName: profile.displayName,
      serviceTitle: row.serviceTitle ?? "Termín",
      amountMinor: depositAmount,
      currency: profile.currency,
      payUrl: `${appUrl()}/pay/${booking.id}`,
      expiresAt: depositExpiresAt,
      timezone: profile.timezone,
      qrDataUri: qr?.dataUri ?? null,
      cardAvailable: Boolean(profile.stripeAccountId),
    });
    await sendEmail({
      to: booking.clientEmail,
      subject: email.subject,
      html: email.html,
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

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function confirmQrPayment(input: {
  bookingId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z.object({ bookingId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const [row] = await db
    .select({
      booking: bookings,
      serviceTitle: services.title,
      serviceDuration: services.durationMinutes,
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
        .set({ method: "qr", status: "succeeded" })
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
    console.error("QR confirm failed", error);
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
    serviceTitle: row.serviceTitle,
    serviceDurationMinutes: row.serviceDuration,
    priceMinor: moved.priceMinor,
    depositAmount: moved.depositAmount,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  return { ok: true };
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
    .set({ status: "rejected" })
    .where(eq(bookings.id, booking.id));

  const email = bookingRejectedEmailForClient({
    clientName: booking.clientName,
    artistName: profile.displayName,
  });
  await sendEmail({
    to: booking.clientEmail,
    subject: email.subject,
    html: email.html,
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
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, booking.id), eq(bookings.status, booking.status)))
    .returning({ id: bookings.id });
  if (!updated.length) return { ok: false, error: "INVALID_STATE" };

  let refundKind: "card" | "bank" | "none" = "none";
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
    if (payment?.method === "qr") {
      refundKind = "bank";
    } else if (payment?.stripePaymentIntentId) {
      try {
        await getStripe().refunds.create({
          payment_intent: payment.stripePaymentIntentId,
        });
        refundKind = "card";
      } catch (error) {
        console.error("Refund failed", error);
        await db
          .update(bookings)
          .set({ status: booking.status })
          .where(eq(bookings.id, booking.id));
        return { ok: false, error: "REFUND_FAILED" };
      }
    }
  }

  if (
    booking.googleEventId &&
    profile.googleRefreshToken &&
    profile.googleCalendarId
  ) {
    try {
      const accessToken = await getAccessTokenForProfile(
        profile.googleRefreshToken
      );
      await deleteCalendarEvent({
        accessToken,
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
    .select({ serviceTitle: services.title })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
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
    });
    await sendEmail({
      to: booking.clientEmail,
      subject: email.subject,
      html: email.html,
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
    .set({ status: "completed" })
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
    serviceTitle: booked.serviceTitle,
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
    serviceTitle: row.serviceTitle,
    invoiceNumber: booking.invoiceNumber,
  });
  return { ok: true };
}
