import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, profiles, services } from "@/db/schema";
import { inngest } from "./client";
import { buildIcsAttachment } from "@/lib/calendar";
import {
  depositExpiredEmailForClient,
  reminderEmailForClient,
  sendEmail,
} from "@/lib/email";

export const functions = [
  inngest.createFunction(
    { id: "deposit-expire", retries: 3, triggers: { event: "deposit/expire" } },
    async ({ event, step }) => {
      const bookingId = event.data.bookingId as string;

      const expired = await step.run("expire-if-unpaid", async () => {
        const [booking] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, bookingId))
          .limit(1);
        if (!booking) return false;
        if (booking.status !== "deposit_pending") return false;
        if (!booking.depositExpiresAt || booking.depositExpiresAt > new Date()) {
          return false;
        }
        await db
          .update(bookings)
          .set({ status: "expired" })
          .where(eq(bookings.id, bookingId));
        return true;
      });

      if (expired) {
        await step.run("notify-client", async () => {
          const [row] = await db
            .select({ booking: bookings, artistName: profiles.displayName })
            .from(bookings)
            .innerJoin(profiles, eq(bookings.profileId, profiles.id))
            .where(eq(bookings.id, bookingId))
            .limit(1);
          if (!row) return;
          const email = depositExpiredEmailForClient({
            clientName: row.booking.clientName,
            artistName: row.artistName,
          });
          await sendEmail({
            to: row.booking.clientEmail,
            subject: email.subject,
            html: email.html,
          });
        });
      }

      return { expired };
    }
  ),
  inngest.createFunction(
    { id: "booking-remind", retries: 3, triggers: { event: "booking/remind" } },
    async ({ event, step }) => {
      const bookingId = event.data.bookingId as string;

      const reminded = await step.run("send-reminder", async () => {
        const [row] = await db
          .select({
            booking: bookings,
            artistName: profiles.displayName,
            artistEmail: profiles.email,
            timezone: profiles.timezone,
            addressLine: profiles.addressLine,
            city: profiles.city,
            zip: profiles.zip,
            serviceTitle: services.title,
            serviceDurationMinutes: services.durationMinutes,
          })
          .from(bookings)
          .innerJoin(profiles, eq(bookings.profileId, profiles.id))
          .leftJoin(services, eq(bookings.serviceId, services.id))
          .where(eq(bookings.id, bookingId))
          .limit(1);
        if (!row) return false;
        const booking = row.booking;
        if (booking.status !== "confirmed") return false;
        if (booking.reminderSentAt || !booking.startTime) return false;
        const now = new Date();
        const windowStart = new Date(
          booking.startTime.getTime() - 24 * 60 * 60 * 1000
        );
        if (now < windowStart || now >= booking.startTime) return false;

        const ics = await buildIcsAttachment({
          uid: booking.id,
          title: `${row.serviceTitle ?? "Termín"} – ${row.artistName}`,
          start: booking.startTime,
          durationMinutes:
            row.serviceDurationMinutes ??
            (booking.endTime
              ? Math.round(
                  (booking.endTime.getTime() - booking.startTime.getTime()) /
                    60000
                )
              : 60),
          description: booking.description,
          location: row.addressLine
            ? `${row.addressLine}, ${row.city ?? ""}${
                row.zip ? ` ${row.zip}` : ""
              }`.replace(/, $/, "")
            : null,
          organizerName: row.artistName,
          organizerEmail: row.artistEmail,
          attendeeName: booking.clientName,
          attendeeEmail: booking.clientEmail,
        });

        const email = reminderEmailForClient({
          clientName: booking.clientName,
          artistName: row.artistName,
          serviceTitle: row.serviceTitle ?? "Termín",
          when: booking.startTime,
          timezone: row.timezone,
          address:
            row.addressLine
              ? {
                  addressLine: row.addressLine,
                  city: row.city ?? "",
                  zip: row.zip ?? "",
                }
              : null,
        });
        await sendEmail({
          to: booking.clientEmail,
          subject: email.subject,
          html: email.html,
          attachments: ics ? [ics] : undefined,
        });

        await db
          .update(bookings)
          .set({ reminderSentAt: new Date() })
          .where(eq(bookings.id, bookingId));
        return true;
      });

      return { reminded };
    }
  ),
];
