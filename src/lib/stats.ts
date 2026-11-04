import { and, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { db } from "@/db";
import { bookings, payments, services } from "@/db/schema";
import type { BookingStatus } from "@/lib/bookings";
import type { BookingRules } from "@/db/schema";

export type StatsPeriod =
  | "this-month"
  | "last-month"
  | "this-year"
  | "last-12-months";

export const STATS_PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: "this-month", label: "Tento měsíc" },
  { key: "last-month", label: "Minulý měsíc" },
  { key: "this-year", label: "Tento rok" },
  { key: "last-12-months", label: "Posledních 12 měsíců" },
];

export function parseStatsPeriod(value: string | undefined): StatsPeriod {
  return STATS_PERIODS.some((period) => period.key === value)
    ? (value as StatsPeriod)
    : "this-month";
}

const pad = (n: number) => String(n).padStart(2, "0");

function normalizeMonth(year: number, month: number) {
  const zero = year * 12 + (month - 1);
  return { year: Math.floor(zero / 12), month: (zero % 12) + 1 };
}

function monthStart(year: number, month: number, tz: string): Date {
  return fromZonedTime(`${year}-${pad(month)}-01T00:00:00`, tz);
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

const SESSION_STATUSES: BookingStatus[] = [
  "deposit_pending",
  "confirmed",
  "completed",
];

type StatusCounts = Record<BookingStatus, number>;

const EMPTY_STATUSES: StatusCounts = {
  pending_review: 0,
  deposit_pending: 0,
  confirmed: 0,
  completed: 0,
  rejected: 0,
  cancelled: 0,
  expired: 0,
};

export type CoreStats = {
  statuses: StatusCounts;
  sessions: number;
  revenue: number;
  completed: number;
  created: number;
  deposits: number;
  refunds: number;
};

export type SeriesPoint = { key: string; label: string; count: number; revenue: number };

export type StatsData = {
  period: StatsPeriod;
  label: string;
  from: Date;
  to: Date;
  current: CoreStats;
  previous: CoreStats;
  series: SeriesPoint[];
  topServices: { label: string; count: number; revenue: number }[];
  byDayOfWeek: number[];
  byHour: number[];
  newClients: number;
  returningClients: number;
  bookedMinutes: number;
  capacityMinutes: number;
  occupancy: number;
  averageTicket: number;
  expectedRevenue: number;
  unpaidDeposits: number;
};

function periodRange(
  period: StatsPeriod,
  tz: string,
  now: Date
): {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  label: string;
  months: number;
  fromYear: number;
  fromMonth: number;
} {
  const year = Number(formatInTimeZone(now, tz, "yyyy"));
  const month = Number(formatInTimeZone(now, tz, "MM"));

  let fromYear = year;
  let fromMonth = month;
  let months = 1;

  if (period === "last-month") {
    ({ year: fromYear, month: fromMonth } = normalizeMonth(year, month - 1));
  } else if (period === "this-year") {
    fromMonth = 1;
    months = 12;
  } else if (period === "last-12-months") {
    ({ year: fromYear, month: fromMonth } = normalizeMonth(year, month - 12));
    months = 12;
  }

  const from = monthStart(fromYear, fromMonth, tz);
  const end = normalizeMonth(fromYear, fromMonth + months);
  const to = monthStart(end.year, end.month, tz);
  const prev = normalizeMonth(fromYear, fromMonth - months);
  const prevFrom = monthStart(prev.year, prev.month, tz);

  const lastMonth = normalizeMonth(fromYear, fromMonth + months - 1);
  const label =
    period === "this-year"
      ? String(fromYear)
      : months === 12
        ? `${monthLabel(fromYear, fromMonth)} – ${monthLabel(
            lastMonth.year,
            lastMonth.month
          )}`
        : monthLabel(fromYear, fromMonth);

  return {
    from,
    to,
    prevFrom,
    prevTo: from,
    label,
    months,
    fromYear,
    fromMonth,
  };
}

async function getCoreStats(
  profileId: string,
  from: Date,
  to: Date
): Promise<CoreStats> {
  const [statusRows, createdRow, depositRow, refundRow] = await Promise.all([
    db
      .select({
        status: bookings.status,
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${bookings.priceMinor}), 0)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.profileId, profileId),
          gte(bookings.startTime, from),
          lt(bookings.startTime, to)
        )
      )
      .groupBy(bookings.status),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.profileId, profileId),
          gte(bookings.createdAt, from),
          lt(bookings.createdAt, to)
        )
      ),
    db
      .select({ sum: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.profileId, profileId),
          eq(payments.status, "succeeded"),
          gte(payments.paidAt, from),
          lt(payments.paidAt, to)
        )
      ),
    db
      .select({ sum: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.profileId, profileId),
          eq(payments.status, "refunded"),
          gte(payments.refundedAt, from),
          lt(payments.refundedAt, to)
        )
      ),
  ]);

  const statuses = { ...EMPTY_STATUSES };
  let revenue = 0;
  for (const row of statusRows) {
    statuses[row.status] = Number(row.count);
    if (row.status === "completed") revenue += Number(row.revenue);
  }
  const sessions = SESSION_STATUSES.reduce(
    (sum, status) => sum + statuses[status],
    0
  );

  return {
    statuses,
    sessions,
    revenue,
    completed: statuses.completed,
    created: Number(createdRow[0]?.count ?? 0),
    deposits: Number(depositRow[0]?.sum ?? 0),
    refunds: Number(refundRow[0]?.sum ?? 0),
  };
}

function min(a: Date, b: Date): Date {
  return a < b ? a : b;
}

function weekdayKeyOf(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
    new Date(Date.UTC(y!, (m ?? 1) - 1, d!)).getUTCDay()
  ]!;
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** Orientační kapacita: pracovní okna po dnech (bez proratování krajních dnů). */
function capacityMinutes(
  rules: BookingRules,
  tz: string,
  from: Date,
  to: Date
): number {
  const startKey = formatInTimeZone(from, tz, "yyyy-MM-dd");
  const endKey = formatInTimeZone(to, tz, "yyyy-MM-dd");
  const [y, m, d] = startKey.split("-").map(Number);
  let total = 0;
  const cursor = new Date(Date.UTC(y!, (m ?? 1) - 1, d!));
  while (cursor.toISOString().slice(0, 10) < endKey) {
    const key = cursor.toISOString().slice(0, 10);
    const exception = rules.exceptions?.[key];
    if (!exception?.closed) {
      const windows =
        exception?.windows ?? rules.weeklySchedule?.[weekdayKeyOf(key)] ?? [];
      total += windows.reduce(
        (sum, window) => sum + minutesOf(window.to) - minutesOf(window.from),
        0
      );
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return total;
}

export async function getStats(
  profile: { id: string; timezone: string; bookingRules: BookingRules | null },
  period: StatsPeriod,
  now = new Date()
): Promise<StatsData> {
  const tz = profile.timezone || "Europe/Prague";
  const range = periodRange(period, tz, now);

  const [current, previous] = await Promise.all([
    getCoreStats(profile.id, range.from, range.to),
    getCoreStats(profile.id, range.prevFrom, range.prevTo),
  ]);

  const seriesDayFormat = "YYYY-MM-DD";
  const occupancyTo = min(range.to, now);

  const [
    seriesRows,
    topRows,
    dowRows,
    hourRows,
    clientRows,
    clientsInRange,
    bookedRow,
    expectedRow,
    unpaidRow,
  ] = await Promise.all([
    db
      .select({
        day: sql<string>`to_char(${bookings.startTime} AT TIME ZONE ${tz}, ${seriesDayFormat})`,
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${bookings.priceMinor}) FILTER (WHERE ${bookings.status} = 'completed'), 0)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.profileId, profile.id),
          inArray(bookings.status, SESSION_STATUSES),
          gte(bookings.startTime, range.from),
          lt(bookings.startTime, range.to)
        )
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({
        label: services.title,
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${bookings.priceMinor}), 0)::int`,
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(
        and(
          eq(bookings.profileId, profile.id),
          eq(bookings.status, "completed"),
          gte(bookings.startTime, range.from),
          lt(bookings.startTime, range.to)
        )
      )
      .groupBy(services.title)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
    db
      .select({
        dow: sql<number>`extract(dow from ${bookings.startTime} AT TIME ZONE ${tz})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.profileId, profile.id),
          inArray(bookings.status, SESSION_STATUSES),
          gte(bookings.startTime, range.from),
          lt(bookings.startTime, range.to)
        )
      )
      .groupBy(sql`1`),
    db
      .select({
        hour: sql<number>`extract(hour from ${bookings.startTime} AT TIME ZONE ${tz})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.profileId, profile.id),
          inArray(bookings.status, SESSION_STATUSES),
          gte(bookings.startTime, range.from),
          lt(bookings.startTime, range.to)
        )
      )
      .groupBy(sql`1`),
    db
      .select({
        email: bookings.clientEmail,
        firstAt: sql<string>`min(${bookings.createdAt})::text`,
      })
      .from(bookings)
      .where(eq(bookings.profileId, profile.id))
      .groupBy(bookings.clientEmail),
    db
      .selectDistinct({ email: bookings.clientEmail })
      .from(bookings)
      .where(
        and(
          eq(bookings.profileId, profile.id),
          gte(bookings.createdAt, range.from),
          lt(bookings.createdAt, range.to)
        )
      ),
    db
      .select({
        minutes: sql<number>`coalesce(sum(extract(epoch from (${bookings.endTime} - ${bookings.startTime})) / 60), 0)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.profileId, profile.id),
          inArray(bookings.status, SESSION_STATUSES),
          gte(bookings.startTime, range.from),
          lt(bookings.startTime, range.to)
        )
      ),
    db
      .select({
        sum: sql<number>`coalesce(sum(${bookings.priceMinor}), 0)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.profileId, profile.id),
          eq(bookings.status, "confirmed"),
          gt(bookings.startTime, now)
        )
      ),
    db
      .select({
        sum: sql<number>`coalesce(sum(${bookings.depositAmount}), 0)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.profileId, profile.id),
          eq(bookings.status, "deposit_pending")
        )
      ),
  ]);

  // Naplníme bucketový graf (po dnech u měsíce, po měsících u roku).
  const series: SeriesPoint[] = [];
  const revenueByBucket = new Map<string, number>();
  for (const row of seriesRows) {
    const bucket = range.months > 1 ? row.day.slice(0, 7) : row.day;
    revenueByBucket.set(
      bucket,
      (revenueByBucket.get(bucket) ?? 0) + Number(row.revenue)
    );
  }
  const countByBucket = new Map<string, number>();
  for (const row of seriesRows) {
    const bucket = range.months > 1 ? row.day.slice(0, 7) : row.day;
    countByBucket.set(bucket, (countByBucket.get(bucket) ?? 0) + Number(row.count));
  }

  if (range.months > 1) {
    for (let index = 0; index < range.months; index++) {
      const normalized = normalizeMonth(
        range.fromYear,
        range.fromMonth + index
      );
      const key = `${normalized.year}-${pad(normalized.month)}`;
      series.push({
        key,
        label: monthLabel(normalized.year, normalized.month),
        count: countByBucket.get(key) ?? 0,
        revenue: revenueByBucket.get(key) ?? 0,
      });
    }
  } else {
    const startKey = formatInTimeZone(range.from, tz, "yyyy-MM-dd");
    const endKey = formatInTimeZone(range.to, tz, "yyyy-MM-dd");
    const [sy, sm, sd] = startKey.split("-").map(Number);
    const cursor = new Date(Date.UTC(sy!, (sm ?? 1) - 1, sd!));
    while (cursor.toISOString().slice(0, 10) < endKey) {
      const key = cursor.toISOString().slice(0, 10);
      series.push({
        key,
        label: `${Number(key.slice(8, 10))}. ${Number(key.slice(5, 7))}.`,
        count: countByBucket.get(key) ?? 0,
        revenue: revenueByBucket.get(key) ?? 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const byDayOfWeek = Array.from({ length: 7 }, () => 0);
  for (const row of dowRows) {
    byDayOfWeek[row.dow] = Number(row.count);
  }
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const row of hourRows) {
    byHour[row.hour] = Number(row.count);
  }

  const inRangeEmails = new Set(clientsInRange.map((row) => row.email));
  const newClients = clientRows.filter(
    (row) =>
      inRangeEmails.has(row.email) &&
      new Date(row.firstAt) >= range.from &&
      new Date(row.firstAt) < range.to
  ).length;
  const returningClients = Math.max(0, inRangeEmails.size - newClients);

  const bookedMinutes = Number(bookedRow[0]?.minutes ?? 0);
  const capacity =
    occupancyTo > range.from
      ? capacityMinutes(profile.bookingRules ?? {}, tz, range.from, occupancyTo)
      : 0;

  return {
    period,
    label: range.label,
    from: range.from,
    to: range.to,
    current,
    previous,
    series,
    topServices: topRows.map((row) => ({
      label: row.label ?? "Bez služby",
      count: Number(row.count),
      revenue: Number(row.revenue),
    })),
    byDayOfWeek,
    byHour,
    newClients,
    returningClients,
    bookedMinutes,
    capacityMinutes: capacity,
    occupancy:
      capacity > 0 ? Math.min(100, Math.round((bookedMinutes / capacity) * 100)) : 0,
    averageTicket:
      current.completed > 0 ? Math.round(current.revenue / current.completed) : 0,
    expectedRevenue: Number(expectedRow[0]?.sum ?? 0),
    unpaidDeposits: Number(unpaidRow[0]?.sum ?? 0),
  };
}
