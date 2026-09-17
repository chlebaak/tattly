import { desc, eq, inArray } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { bookingAssets, bookings, payments, services } from "@/db/schema";
import type { Profile } from "@/db/schema";
import type { BookingStatus } from "@/lib/bookings";
import type { CalendarChip } from "@/components/month-calendar";
import type { BookingView } from "./booking-view";

export const STATUS_WEIGHT: Record<BookingStatus, number> = {
  pending_review: 0,
  deposit_pending: 1,
  confirmed: 2,
  completed: 3,
  expired: 4,
  cancelled: 5,
  rejected: 6,
};

export async function getDashboardData(profile: Profile): Promise<{
  bookingsView: BookingView[];
  chipsByDay: Record<string, CalendarChip[]>;
  blockedDays: string[];
}> {
  const tz = profile.timezone || "Europe/Prague";

  const rows = await db
    .select({
      booking: bookings,
      serviceTitle: services.title,
      customFormFields: services.customFormFields,
      servicePriceMinor: services.priceMinor,
      serviceDepositMinor: services.depositMinor,
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.profileId, profile.id))
    .orderBy(desc(bookings.createdAt));
  const sorted = [...rows].sort(
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
        })
        .from(payments)
        .where(inArray(payments.bookingId, bookingIds))
    : [];
  const paymentMethodByBooking = new Map<string, "stripe" | "qr" | null>();
  for (const p of paymentRows) {
    if (!paymentMethodByBooking.has(p.bookingId)) {
      paymentMethodByBooking.set(p.bookingId, p.method);
    }
  }

  const dayKey = (d: Date) => formatInTimeZone(d, tz, "yyyy-MM-dd");

  const bookingsView: BookingView[] = sorted.map(
    ({ booking, serviceTitle, customFormFields, servicePriceMinor, serviceDepositMinor }) => ({
      id: booking.id,
      status: booking.status,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      description: booking.description,
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
      defaultDepositCents: profile.defaultDepositAmount,
      qrAvailable: Boolean(profile.bankAccount),
      cardAvailable: Boolean(profile.stripeAccountId),
      paymentMethod: paymentMethodByBooking.get(booking.id) ?? null,
    })
  );

  const chipsByDay: Record<string, CalendarChip[]> = {};
  for (const { booking } of sorted) {
    if (!booking.startTime) continue;
    if (booking.status !== "confirmed" && booking.status !== "deposit_pending") {
      continue;
    }
    const key = dayKey(booking.startTime);
    const chips = (chipsByDay[key] ??= []);
    chips.push({
      id: booking.id,
      timeLabel: formatInTimeZone(booking.startTime, tz, "HH:mm"),
      label: booking.clientName,
      variant: booking.status === "confirmed" ? "solid" : "outline",
    });
  }
  for (const chips of Object.values(chipsByDay)) {
    chips.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
  }

  const blockedDays = Object.entries(profile.bookingRules?.exceptions ?? {})
    .filter(([, exception]) => exception.closed)
    .map(([key]) => key);

  return { bookingsView, chipsByDay, blockedDays };
}
