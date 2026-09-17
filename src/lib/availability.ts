import { and, eq, inArray, sql } from "drizzle-orm";
import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { db } from "@/db";
import { bookings, profiles, type BookingRules } from "@/db/schema";
import { generateSlotsForWindow, type BusyInterval, type Slot } from "./slots";

export type { Slot, BusyInterval };

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DEFAULT_TIMEZONE = "Europe/Prague";

function overlaps(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
): boolean {
  return a.start < b.end && b.start < a.end;
}

function zonedTime(day: string, hhmm: string, timezone: string): Date {
  return fromZonedTime(`${day}T${hhmm}:00`, timezone);
}

function dayKeyOf(day: string, timezone: string): string {
  const noon = fromZonedTime(`${day}T12:00:00`, timezone);
  return DAY_KEYS[noon.getUTCDay()]!;
}

function dayString(base: Date, timezone: string): string {
  return formatInTimeZone(base, timezone, "yyyy-MM-dd");
}

export function hasWeeklySchedule(
  rules: BookingRules | null | undefined
): boolean {
  return Boolean(
    rules?.weeklySchedule &&
      Object.values(rules.weeklySchedule).some((w) => w.length > 0)
  );
}

export async function getBusyIntervals(
  profileId: string,
  from: Date,
  to: Date
): Promise<BusyInterval[]> {
  const rows = await db
    .select({
      start: bookings.startTime,
      end: bookings.endTime,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.profileId, profileId),
        inArray(bookings.status, ["deposit_pending", "confirmed"]),
        sql`tstzrange(start_time, end_time, '[)') && tstzrange(${from.toISOString()}::timestamptz, ${to.toISOString()}::timestamptz, '[)')`
      )
    );
  return rows
    .filter((r) => r.start && r.end)
    .map((r) => ({ start: r.start as Date, end: r.end as Date }));
}

export async function getAvailability(params: {
  profileId: string;
  from: Date;
  days: number;
  durationMinutes?: number;
  intervalMinutes?: number;
  googleBusy?: BusyInterval[];
}): Promise<Slot[]> {
  const [profile] = await db
    .select({
      bookingRules: profiles.bookingRules,
      timezone: profiles.timezone,
    })
    .from(profiles)
    .where(eq(profiles.id, params.profileId))
    .limit(1);
  if (!profile) return [];

  const rules: BookingRules = profile.bookingRules ?? {};
  const schedule = rules.weeklySchedule ?? {};
  if (!hasWeeklySchedule(rules)) return [];

  const timezone = profile.timezone || DEFAULT_TIMEZONE;
  const interval =
    params.intervalMinutes ?? rules.slotIntervalMinutes ?? 30;
  const leadHours = rules.minLeadTimeHours ?? 24;
  const maxPerDay = rules.maxBookingsPerDay;
  const duration = params.durationMinutes ?? interval;
  const earliestStart = new Date(Date.now() + leadHours * 60 * 60 * 1000);

  const startDay = dayString(params.from, timezone);
  const lastDay = format(
    addDays(parseISO(`${startDay}T12:00:00`), params.days - 1),
    "yyyy-MM-dd"
  );
  const rangeStart = zonedTime(startDay, "00:00", timezone);
  const rangeEnd = zonedTime(lastDay, "23:59", timezone);

  const busy = [
    ...(await getBusyIntervals(params.profileId, rangeStart, rangeEnd)),
    ...(params.googleBusy ?? []),
  ];

  const slots: Slot[] = [];
  for (let offset = 0; offset < params.days; offset++) {
    const day = format(
      addDays(parseISO(`${startDay}T12:00:00`), offset),
      "yyyy-MM-dd"
    );
    const exception = rules.exceptions?.[day];
    if (exception?.closed) continue;
    const windows =
      exception?.windows ?? schedule[dayKeyOf(day, timezone)] ?? [];
    if (!windows.length) continue;
    const dayStart = zonedTime(day, "00:00", timezone);
    const dayEnd = zonedTime(day, "23:59", timezone);
    const dayBooked = busy.filter((b) =>
      overlaps(b, { start: dayStart, end: dayEnd })
    ).length;
    if (maxPerDay !== undefined && dayBooked >= maxPerDay) continue;

    for (const window of windows) {
      slots.push(
        ...generateSlotsForWindow({
          windowStart: zonedTime(day, window.from, timezone),
          windowEnd: zonedTime(day, window.to, timezone),
          durationMinutes: duration,
          intervalMinutes: interval,
          busy,
          earliestStart,
        })
      );
    }
  }
  return slots;
}
