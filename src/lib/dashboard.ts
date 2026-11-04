import { and, count, countDistinct, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { bankConnections, bankTransactions, bookings } from "@/db/schema";
import type { BookingView } from "@/app/(dashboard)/dashboard/booking-view";

export type DashboardQueueItem =
  | { kind: "request"; key: string; booking: BookingView }
  | { kind: "claim"; key: string; booking: BookingView }
  | { kind: "message"; key: string; booking: BookingView };

export type DashboardMoney = {
  revenue: number;
  expected: number;
  unpaid: number;
};

const QUEUE_ORDER: Record<DashboardQueueItem["kind"], number> = {
  request: 0,
  claim: 1,
  message: 2,
};

/** Nejbližší potvrzený termín – kotva Přehledu. */
export function getNextAppointment(
  bookings: BookingView[],
  now: Date
): BookingView | null {
  return (
    bookings
      .filter(
        (booking) =>
          booking.status === "confirmed" &&
          booking.startTimeIso !== null &&
          new Date(booking.startTimeIso) > now
      )
      .sort((a, b) =>
        (a.startTimeIso ?? "").localeCompare(b.startTimeIso ?? "")
      )[0] ?? null
  );
}

/** Potvrzené a dokončené termíny pro konkrétní den. */
export function getDayAgenda(
  bookings: BookingView[],
  dayKey: string
): BookingView[] {
  return bookings
    .filter(
      (booking) =>
        booking.startDayKey === dayKey &&
        (booking.status === "confirmed" || booking.status === "completed")
    )
    .sort((a, b) =>
      (a.startTimeIso ?? "").localeCompare(b.startTimeIso ?? "")
    );
}

/**
 * Fronta obsahuje jen to, co má udělat tatér. Čekání na zaplacení
 * zálohy je věc klienta, a proto se sem nepočítá.
 */
export function buildActionQueue(
  bookings: BookingView[]
): DashboardQueueItem[] {
  const items: DashboardQueueItem[] = [];

  for (const booking of bookings) {
    if (booking.status === "pending_review") {
      items.push({ kind: "request", key: booking.id, booking });
      continue;
    }
    if (booking.status === "deposit_pending" && booking.clientPaidAtIso) {
      items.push({ kind: "claim", key: booking.id, booking });
      continue;
    }
    if (booking.openRequest) {
      items.push({ kind: "message", key: booking.id, booking });
    }
  }

  return items.sort(
    (a, b) =>
      QUEUE_ORDER[a.kind] - QUEUE_ORDER[b.kind] ||
      b.booking.createdAtIso.localeCompare(a.booking.createdAtIso)
  );
}

/** Stornované rezervace s úspěšně přijatou zálohou čekající na vrácení. */
export function getRefunds(bookings: BookingView[]): BookingView[] {
  return bookings.filter(
    (booking) =>
      booking.status === "cancelled" &&
      booking.payment?.status === "succeeded"
  );
}

/** Peníze za aktuální měsíc – stejné definice jako Statistiky. */
export function getMonthMoney(
  bookings: BookingView[],
  monthPrefix: string,
  now: Date
): DashboardMoney {
  let revenue = 0;
  let expected = 0;
  let unpaid = 0;

  for (const booking of bookings) {
    if (
      booking.status === "completed" &&
      booking.startDayKey?.startsWith(monthPrefix)
    ) {
      revenue += booking.priceMinor ?? 0;
    }
    if (
      booking.status === "confirmed" &&
      booking.startTimeIso &&
      new Date(booking.startTimeIso) > now
    ) {
      expected += booking.priceMinor ?? 0;
    }
    if (booking.status === "deposit_pending") {
      unpaid += booking.depositAmount ?? 0;
    }
  }

  return { revenue, expected, unpaid };
}

/**
 * Lehký počet akcí pro sidebar a mobilní navigaci. Záměrně nezahrnuje
 * „čeká na klienta“, aby badge nebyly trvale nafouknuté.
 */
export async function getActionCount(profileId: string): Promise<number> {
  const [bookingRow] = await db
    .select({ value: countDistinct(bookings.id) })
    .from(bookings)
    .where(
      and(
        eq(bookings.profileId, profileId),
        or(
          eq(bookings.status, "pending_review"),
          isNotNull(bookings.openRequest),
          and(
            eq(bookings.status, "deposit_pending"),
            isNotNull(bookings.clientPaidAt)
          ),
          and(
            eq(bookings.status, "cancelled"),
            isNotNull(bookings.clientPaidAt)
          )
        )
      )
    );

  const [unmatchedRow] = await db
    .select({ value: count() })
    .from(bankTransactions)
    .innerJoin(
      bankConnections,
      eq(bankTransactions.connectionId, bankConnections.id)
    )
    .where(
      and(
        eq(bankConnections.profileId, profileId),
        isNull(bankTransactions.bookingId),
        eq(bankTransactions.direction, "in")
      )
    );

  return Number(bookingRow?.value ?? 0) + Number(unmatchedRow?.value ?? 0);
}
