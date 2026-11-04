import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { db } from "@/db";
import {
  bookings,
  profiles,
  type BookingRules,
  type Profile,
} from "@/db/schema";
import { googleAccessForProfile, queryFreebusy } from "./google";
import { generateSlotsForWindow, type BusyInterval, type Slot } from "./slots";

export { resolveSlotInterval } from "./slots";

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

function dayKeyOf(day: string): string {
  // Den v týdnu se bere z kalendářního data (UTC poledne), ne z okamžiku
  // v pásmu tatéra – jinak by se u pásem UTC+13 a UTC-12 posunul o den.
  return DAY_KEYS[new Date(`${day}T12:00:00Z`).getUTCDay()]!;
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

/**
 * Volné termíny v rámci jednoho dne. Používá se v dashboardu při schvalování
 * a přesunu rezervace (bez minimální lhůty) i v kalendáři (s lhůtou).
 */
export async function getDaySlots(params: {
  profileId: string;
  dayKey: string;
  timezone: string;
  durationMinutes: number;
  intervalMinutes?: number;
  excludeBookingId?: string;
  respectLeadTime?: boolean;
}): Promise<Slot[]> {
  const from = fromZonedTime(`${params.dayKey}T12:00:00`, params.timezone);
  return getAvailability({
    profileId: params.profileId,
    from,
    days: 1,
    durationMinutes: params.durationMinutes,
    intervalMinutes: params.intervalMinutes,
    excludeBookingId: params.excludeBookingId,
    ignoreLeadTime: !params.respectLeadTime,
  });
}

export async function getBusyIntervals(
  profileId: string,
  from: Date,
  to: Date,
  excludeBookingId?: string
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
        excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
        sql`tstzrange(start_time, end_time, '[)') && tstzrange(${from.toISOString()}::timestamptz, ${to.toISOString()}::timestamptz, '[)')`
      )
    );
  return rows
    .filter((r) => r.start && r.end)
    .map((r) => ({ start: r.start as Date, end: r.end as Date }));
}

/**
 * Obsazenost z Google kalendáře. Když propojení nefunguje, vrátí prázdno
 * (a `googleAccessForProfile` případně označí profil k opětovnému připojení).
 */
export async function getGoogleBusy(
  profile: Profile,
  from: Date,
  to: Date
): Promise<BusyInterval[]> {
  const accessToken = await googleAccessForProfile(profile);
  const calendarId = profile.googleCalendarId;
  if (!accessToken || !calendarId) return [];
  try {
    return await queryFreebusy({
      accessToken,
      calendarId,
      timeMin: from,
      timeMax: to,
    });
  } catch (error) {
    console.error("Google freebusy failed", error);
    return [];
  }
}

/** Obsazenost z databáze i z Google dohromady. */
export async function getBusyWithGoogle(
  profile: Profile,
  from: Date,
  to: Date,
  excludeBookingId?: string
): Promise<BusyInterval[]> {
  const [dbBusy, googleBusy] = await Promise.all([
    getBusyIntervals(profile.id, from, to, excludeBookingId),
    getGoogleBusy(profile, from, to),
  ]);
  return [...dbBusy, ...googleBusy];
}

export async function getAvailability(params: {
  profileId: string;
  from: Date;
  days: number;
  durationMinutes?: number;
  intervalMinutes?: number;
  googleBusy?: BusyInterval[];
  /** Ignoruje se vlastní obsazený termín (přesun rezervace). */
  excludeBookingId?: string;
  /** Přeskočí minimální lhůtu – pro schvalování ze strany tatéra. */
  ignoreLeadTime?: boolean;
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
  const earliestStart = params.ignoreLeadTime
    ? new Date()
    : new Date(Date.now() + leadHours * 60 * 60 * 1000);

  const startDay = dayString(params.from, timezone);
  const lastDay = format(
    addDays(parseISO(`${startDay}T12:00:00`), params.days - 1),
    "yyyy-MM-dd"
  );
  const rangeStart = zonedTime(startDay, "00:00", timezone);
  const rangeEnd = zonedTime(lastDay, "23:59", timezone);

  const dbBusy = await getBusyIntervals(
    params.profileId,
    rangeStart,
    rangeEnd,
    params.excludeBookingId
  );
  const busy = [...dbBusy, ...(params.googleBusy ?? [])];

  const slots: Slot[] = [];
  for (let offset = 0; offset < params.days; offset++) {
    const day = format(
      addDays(parseISO(`${startDay}T12:00:00`), offset),
      "yyyy-MM-dd"
    );
    const exception = rules.exceptions?.[day];
    if (exception?.closed) continue;
    const windows =
      exception?.windows ?? schedule[dayKeyOf(day)] ?? [];
    if (!windows.length) continue;
    const dayStart = zonedTime(day, "00:00", timezone);
    const dayEnd = zonedTime(day, "23:59", timezone);
    // Limit na den počítá jen rezervace – události z Google kalendáře
    // blokují konkrétní časy, ale „plný den" z nich dělat nechceme.
    const dayBooked = dbBusy.filter((b) =>
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
