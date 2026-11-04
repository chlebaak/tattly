import { and, desc, eq, gt, inArray, isNotNull, or } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { bookingAssets, bookings, payments, services } from "@/db/schema";
import type { Profile } from "@/db/schema";
import type { BookingStatus } from "@/lib/bookings";
import type { BookingPayment, BookingView } from "./booking-view";

export const STATUS_WEIGHT: Record<BookingStatus, number> = {
  pending_review: 0,
  deposit_pending: 1,
  confirmed: 2,
  completed: 3,
  expired: 4,
  cancelled: 5,
  rejected: 6,
};

/** Přehled nenačítá celou historii – starší rezervace zůstávají v kalendáři. */
const DASHBOARD_LIMIT = 600;
const DASHBOARD_WINDOW_DAYS = 365;

export async function getDashboardData(
  profile: Profile,
  options?: { full?: boolean }
): Promise<{
  bookingsView: BookingView[];
  blockedDays: string[];
  /** True = v přehledu je zkrácená historie (starší kusy jsou v kalendáři). */
  listTruncated: boolean;
}> {
  const tz = profile.timezone || "Europe/Prague";

  // V dashboardu nikdy nezahazujeme nic, co vyžaduje pozornost (poptávky,
  // nezaplacené zálohy, požadavky klientů, vratky) – ořezáváme jen starou
  // vyřízenou historii, a i tu nejdřív po roce provozu.
  const windowStart = new Date(
    Date.now() - DASHBOARD_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
  const where = options?.full
    ? eq(bookings.profileId, profile.id)
    : and(
        eq(bookings.profileId, profile.id),
        or(
          gt(bookings.createdAt, windowStart),
          inArray(bookings.status, ["pending_review", "deposit_pending"]),
          isNotNull(bookings.openRequest),
          and(
            eq(bookings.status, "cancelled"),
            isNotNull(bookings.clientPaidAt)
          )
        )
      );

  const rows = await db
    .select({
      booking: bookings,
      serviceTitle: services.title,
      customFormFields: services.customFormFields,
      servicePriceMinor: services.priceMinor,
      serviceDepositMinor: services.depositMinor,
      serviceDurationMinutes: services.durationMinutes,
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(options?.full ? 5000 : DASHBOARD_LIMIT + 1);
  const listTruncated = !options?.full && rows.length > DASHBOARD_LIMIT;
  const bounded = listTruncated ? rows.slice(0, DASHBOARD_LIMIT) : rows;
  const sorted = [...bounded].sort(
    (a, b) => STATUS_WEIGHT[a.booking.status] - STATUS_WEIGHT[b.booking.status]
  );

  const bookingIds = sorted.map((r) => r.booking.id);
  const assetRows = bookingIds.length
    ? await db
        .select({ id: bookingAssets.id, bookingId: bookingAssets.bookingId })
        .from(bookingAssets)
        .where(inArray(bookingAssets.bookingId, bookingIds))
    : [];
  const assetCountByBooking = new Map<string, number>();
  for (const row of assetRows) {
    assetCountByBooking.set(
      row.bookingId,
      (assetCountByBooking.get(row.bookingId) ?? 0) + 1
    );
  }

  const paymentRows = bookingIds.length
    ? await db
        .select({
          bookingId: payments.bookingId,
          method: payments.method,
          status: payments.status,
          amount: payments.amount,
          currency: payments.currency,
          refundedAt: payments.refundedAt,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(inArray(payments.bookingId, bookingIds))
    : [];
  const paymentMethodByBooking = new Map<string, "stripe" | "qr" | "bank" | null>();
  const paymentByBooking = new Map<string, BookingPayment>();
  for (const p of paymentRows) {
    if (!paymentMethodByBooking.has(p.bookingId)) {
      paymentMethodByBooking.set(p.bookingId, p.method);
    }
    // Nejdůležitější je úspěšná platba, jinak ta poslední.
    const existing = paymentByBooking.get(p.bookingId);
    const isBetter =
      !existing ||
      (p.status === "succeeded" && existing.status !== "succeeded") ||
      (p.status === "refunded" && existing.status === "pending");
    if (isBetter) {
      paymentByBooking.set(p.bookingId, {
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        refundedAtIso: p.refundedAt ? p.refundedAt.toISOString() : null,
      });
    }
  }

  const dayKey = (d: Date) => formatInTimeZone(d, tz, "yyyy-MM-dd");

  const bookingsView: BookingView[] = sorted.map(
    ({
      booking,
      serviceTitle,
      customFormFields,
      servicePriceMinor,
      serviceDepositMinor,
      serviceDurationMinutes,
    }) => ({
      id: booking.id,
      status: booking.status,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      description: booking.description,
      notes: booking.notes,
      openRequest: booking.openRequest ?? null,
      clientPaidAtIso: booking.clientPaidAt
        ? booking.clientPaidAt.toISOString()
        : null,
      variableSymbol: booking.variableSymbol,
      clientIban: booking.clientIban,
      payment: paymentByBooking.get(booking.id) ?? null,
      serviceTitle,
      customEntries: Object.entries(booking.formData).map(([key, value]) => ({
        label: customFormFields?.find((f) => f.id === key)?.label ?? key,
        value: String(value),
      })),
      startTimeIso: booking.startTime ? booking.startTime.toISOString() : null,
      startDayKey: booking.startTime ? dayKey(booking.startTime) : null,
      startLabel: booking.startTime
        ? new Intl.DateTimeFormat("cs-CZ", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: tz,
          }).format(booking.startTime)
        : null,
      startTimeLabel: booking.startTime
        ? formatInTimeZone(booking.startTime, tz, "HH:mm")
        : null,
      proposedStartValue: booking.startTime
        ? formatInTimeZone(booking.startTime, tz, "yyyy-MM-dd'T'HH:mm")
        : null,
      durationMinutes:
        booking.startTime && booking.endTime
          ? Math.round(
              (booking.endTime.getTime() - booking.startTime.getTime()) / 60000
            )
          : null,
      depositAmount: booking.depositAmount,
      priceMinor: booking.priceMinor,
      servicePriceMinor,
      serviceDepositMinor,
      serviceDurationMinutes,
      invoiceNumber: booking.invoiceNumber,
      depositExpiresLabel: booking.depositExpiresAt
        ? new Intl.DateTimeFormat("cs-CZ", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: tz,
          }).format(booking.depositExpiresAt)
        : null,
      reminderSent: booking.reminderSentAt !== null,
      googleLinked: booking.googleEventId !== null,
      assetCount: assetCountByBooking.get(booking.id) ?? 0,
      assetsPurgeLabel: booking.assetsPurgeAfter
        ? new Intl.DateTimeFormat("cs-CZ", {
            dateStyle: "medium",
            timeZone: tz,
          }).format(booking.assetsPurgeAfter)
        : null,
      defaultDepositCents: profile.defaultDepositAmount,
      qrAvailable: Boolean(profile.bankAccount),
      paymentMethod: paymentMethodByBooking.get(booking.id) ?? null,
      createdAtIso: booking.createdAt.toISOString(),
    })
  );

  const blockedDays = Object.entries(profile.bookingRules?.exceptions ?? {})
    .filter(([, exception]) => exception.closed)
    .map(([key]) => key);

  return { bookingsView, blockedDays, listTruncated };
}
