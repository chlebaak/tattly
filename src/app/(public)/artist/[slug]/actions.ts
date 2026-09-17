"use server";

import { z } from "zod";
import { addDays, addMinutes } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingAssets, bookings, profiles, services } from "@/db/schema";
import {
  getAvailability,
  getBusyIntervals,
  hasWeeklySchedule,
} from "@/lib/availability";
import type { BusyInterval } from "@/lib/google";
import { getAccessTokenForProfile, queryFreebusy } from "@/lib/google";
import {
  newRequestEmailForArtist,
  requestReceivedEmailForClient,
  sendEmail,
} from "@/lib/email";
import { appUrl } from "@/lib/env";

const createRequestSchema = z.object({
  slug: z.string().min(1).max(64),
  serviceId: z.uuid(),
  clientName: z.string().min(2).max(120),
  clientEmail: z.email(),
  clientPhone: z.string().max(32).optional(),
  description: z.string().max(2000).optional(),
  startIso: z.iso.datetime(),
  formData: z.record(z.string(), z.string()).optional(),
  assetKeys: z.array(z.string().min(1).max(512)).max(4).optional(),
});

const getSlotsSchema = z.object({
  slug: z.string().min(1).max(64),
  serviceId: z.uuid(),
  fromIso: z.iso.datetime(),
  days: z.coerce.number().int().min(1).max(62).optional(),
});

export type CreateBookingResult =
  | { ok: true }
  | { ok: false; error: string };

export type GetSlotsResult =
  | {
      ok: true;
      hasSchedule: boolean;
      slots: { startIso: string; endIso: string }[];
    }
  | { ok: false; error: string };

async function fetchGoogleBusy(
  refreshTokenEncrypted: string | null,
  calendarId: string | null,
  from: Date,
  to: Date
): Promise<BusyInterval[]> {
  if (!refreshTokenEncrypted || !calendarId) return [];
  try {
    const accessToken = await getAccessTokenForProfile(refreshTokenEncrypted);
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

export async function getAvailableSlots(
  input: unknown
): Promise<GetSlotsResult> {
  const parsed = getSlotsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const data = parsed.data;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.slug, data.slug))
    .limit(1);
  if (!profile) return { ok: false, error: "PROFILE_NOT_FOUND" };

  const [service] = await db
    .select({
      durationMinutes: services.durationMinutes,
      slotIntervalMinutes: services.slotIntervalMinutes,
    })
    .from(services)
    .where(
      and(
        eq(services.id, data.serviceId),
        eq(services.profileId, profile.id),
        eq(services.isActive, true)
      )
    )
    .limit(1);
  if (!service) return { ok: false, error: "SERVICE_NOT_FOUND" };

  const from = new Date(data.fromIso);
  const days = data.days ?? 14;
  const googleBusy = await fetchGoogleBusy(
    profile.googleRefreshToken,
    profile.googleCalendarId,
    from,
    addDays(from, days)
  );

  const slots = await getAvailability({
    profileId: profile.id,
    from,
    days,
    durationMinutes: service.durationMinutes,
    intervalMinutes:
      service.slotIntervalMinutes ?? service.durationMinutes,
    googleBusy,
  });

  return {
    ok: true,
    hasSchedule: hasWeeklySchedule(profile.bookingRules),
    slots: slots.map((s) => ({
      startIso: s.start.toISOString(),
      endIso: s.end.toISOString(),
    })),
  };
}

export async function createBookingRequest(
  input: unknown
): Promise<CreateBookingResult> {
  const parsed = createRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const data = parsed.data;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.slug, data.slug))
    .limit(1);
  if (!profile) return { ok: false, error: "PROFILE_NOT_FOUND" };
  if (!hasWeeklySchedule(profile.bookingRules)) {
    return { ok: false, error: "NO_AVAILABILITY" };
  }

  const [service] = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.id, data.serviceId),
        eq(services.profileId, profile.id),
        eq(services.isActive, true)
      )
    )
    .limit(1);
  if (!service) return { ok: false, error: "SERVICE_NOT_FOUND" };

  const start = new Date(data.startIso);
  const end = addMinutes(start, service.durationMinutes);

  const [dbBusy, googleBusy] = await Promise.all([
    getBusyIntervals(profile.id, start, end),
    fetchGoogleBusy(
      profile.googleRefreshToken,
      profile.googleCalendarId,
      start,
      end
    ),
  ]);
  const clash = [...dbBusy, ...googleBusy].some(
    (b) => b.start < end && start < b.end
  );
  if (clash) return { ok: false, error: "SLOT_TAKEN" };

  const [created] = await db
    .insert(bookings)
    .values({
      profileId: profile.id,
      serviceId: service.id,
      status: "pending_review",
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone || null,
      description: data.description || null,
      formData: data.formData ?? {},
      startTime: start,
      endTime: end,
      priceMinor: service.priceMinor ?? null,
    })
    .returning({ id: bookings.id });

  if (data.assetKeys?.length) {
    await db.insert(bookingAssets).values(
      data.assetKeys.map((key) => ({
        bookingId: created.id,
        storagePath: key,
      }))
    );
  }

  const artistEmail = newRequestEmailForArtist({
    artistName: profile.displayName,
    clientName: data.clientName,
    serviceTitle: service.title,
    when: start,
    timezone: profile.timezone,
    bookingUrl: `${appUrl()}/dashboard`,
  });
  await sendEmail({
    to: profile.email,
    subject: artistEmail.subject,
    html: artistEmail.html,
  });

  const clientEmail = requestReceivedEmailForClient({
    clientName: data.clientName,
    artistName: profile.displayName,
  });
  await sendEmail({
    to: data.clientEmail,
    subject: clientEmail.subject,
    html: clientEmail.html,
  });

  return { ok: true };
}
