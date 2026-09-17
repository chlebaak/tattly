import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Profile } from "@/db/schema";
import { buildIcsAttachment } from "./calendar";
import { bookingConfirmedEmailForClient, sendEmail } from "./email";
import { createCalendarEvent, getAccessTokenForProfile } from "./google";
import { inngest } from "@/inngest/client";
import { appUrl } from "./env";

export async function onBookingConfirmed(params: {
  profile: Profile;
  bookingId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  description: string | null;
  startTime: Date;
  endTime: Date;
  serviceTitle: string | null;
  serviceDurationMinutes: number | null;
  priceMinor: number | null;
  depositAmount: number | null;
}): Promise<void> {
  const { profile } = params;

  const addressText =
    profile.addressLine
      ? `${profile.addressLine}, ${profile.city ?? ""}${
          profile.zip ? ` ${profile.zip}` : ""
        }`.replace(/, $/, "")
      : null;

  if (profile.googleRefreshToken && profile.googleCalendarId) {
    try {
      const accessToken = await getAccessTokenForProfile(
        profile.googleRefreshToken
      );
      const eventId = await createCalendarEvent({
        accessToken,
        calendarId: profile.googleCalendarId,
        artistName: profile.displayName,
        serviceTitle: params.serviceTitle ?? "Rezervace",
        start: params.startTime,
        end: params.endTime,
        clientName: params.clientName,
        clientEmail: params.clientEmail,
        clientPhone: params.clientPhone,
        description: params.description,
        bookingUrl: `${appUrl()}/dashboard`,
      });
      if (eventId) {
        await db
          .update(bookings)
          .set({ googleEventId: eventId })
          .where(eq(bookings.id, params.bookingId));
      }
    } catch (error) {
      console.error("Google calendar event failed", error);
    }
  }

  const remindAt = new Date(params.startTime.getTime() - 24 * 60 * 60 * 1000);
  if (remindAt > new Date()) {
    await inngest.send({
      name: "booking/remind",
      data: { bookingId: params.bookingId },
      ts: remindAt.getTime(),
    });
  }

  const ics = await buildIcsAttachment({
    uid: params.bookingId,
    title: `${params.serviceTitle ?? "Termín"} – ${profile.displayName}`,
    start: params.startTime,
    durationMinutes:
      params.serviceDurationMinutes ??
      Math.round(
        (params.endTime.getTime() - params.startTime.getTime()) / 60000
      ),
    description: params.description,
    location: addressText,
    organizerName: profile.displayName,
    organizerEmail: profile.email,
    attendeeName: params.clientName,
    attendeeEmail: params.clientEmail,
  });
  const email = bookingConfirmedEmailForClient({
    clientName: params.clientName,
    artistName: profile.displayName,
    serviceTitle: params.serviceTitle ?? "Termín",
    when: params.startTime,
    timezone: profile.timezone,
    address: profile.addressLine
      ? {
          addressLine: profile.addressLine,
          city: profile.city ?? "",
          zip: profile.zip ?? "",
        }
      : null,
    price:
      params.priceMinor && params.priceMinor > 0
        ? { amountMinor: params.priceMinor, currency: profile.currency }
        : null,
    deposit:
      params.depositAmount && params.depositAmount > 0
        ? { amountMinor: params.depositAmount, currency: profile.currency }
        : null,
  });
  await sendEmail({
    to: params.clientEmail,
    subject: email.subject,
    html: email.html,
    attachments: ics ? [ics] : undefined,
  });
}
