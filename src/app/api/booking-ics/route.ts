import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, profiles, services } from "@/db/schema";
import { buildIcsAttachment } from "@/lib/calendar";

/**
 * .ics soubor k rezervaci pro klienta – odkaz je na stavové stránce.
 * Přístupný jen s kódem rezervace (stejně jako stavová stránka).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "MISSING_CODE" }, { status: 400 });
  }

  const [row] = await db
    .select({
      booking: bookings,
      artistName: profiles.displayName,
      artistEmail: profiles.email,
      addressLine: profiles.addressLine,
      city: profiles.city,
      zip: profiles.zip,
      serviceTitle: services.title,
      serviceDurationMinutes: services.durationMinutes,
    })
    .from(bookings)
    .innerJoin(profiles, eq(bookings.profileId, profiles.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.statusCode, code))
    .limit(1);

  const booking = row?.booking;
  const startTime = booking?.startTime;
  if (!row || !booking || !startTime) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return NextResponse.json({ error: "NOT_CONFIRMED" }, { status: 409 });
  }

  const ics = await buildIcsAttachment({
    uid: booking.id,
    title: `${row.serviceTitle ?? "Termín"} – ${row.artistName}`,
    start: startTime,
    durationMinutes:
      row.serviceDurationMinutes ??
      (booking.endTime
        ? Math.round((booking.endTime.getTime() - startTime.getTime()) / 60000)
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
  if (!ics) {
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 500 });
  }

  return new NextResponse(Buffer.from(ics.content, "base64"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="termin.ics"',
      "Cache-Control": "no-store",
    },
  });
}
