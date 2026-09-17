import { decryptSecret } from "./crypto";
import { requireEnv } from "./env";
import type { BusyInterval } from "./slots";

export type { BusyInterval };

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function getAccessTokenForProfile(
  refreshTokenEncrypted: string
): Promise<string> {
  const refreshToken = decryptSecret(refreshTokenEncrypted);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("AUTH_GOOGLE_ID"),
      client_secret: requireEnv("AUTH_GOOGLE_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Google token refresh returned no access token");
  }
  return data.access_token;
}

export async function queryFreebusy(params: {
  accessToken: string;
  calendarId: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<BusyInterval[]> {
  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: params.timeMin.toISOString(),
      timeMax: params.timeMax.toISOString(),
      items: [{ id: params.calendarId }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Google freebusy failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const busy = data.calendars?.[params.calendarId]?.busy ?? [];
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export async function createCalendarEvent(params: {
  accessToken: string;
  calendarId: string;
  artistName: string;
  serviceTitle: string;
  start: Date;
  end: Date;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  description: string | null;
  bookingUrl: string;
}): Promise<string | null> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(params.calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `${params.serviceTitle} – ${params.clientName}`,
        description: [
          `Klient: ${params.clientName}`,
          `E-mail: ${params.clientEmail}`,
          params.clientPhone ? `Telefon: ${params.clientPhone}` : null,
          params.description ? `Popis: ${params.description}` : null,
          `Detail zakázky: ${params.bookingUrl}`,
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: params.start.toISOString() },
        end: { dateTime: params.end.toISOString() },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Google calendar event failed: ${res.status}`);
  }
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

export async function updateCalendarEvent(params: {
  accessToken: string;
  calendarId: string;
  eventId: string;
  artistName: string;
  serviceTitle: string;
  start: Date;
  end: Date;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  description: string | null;
  bookingUrl: string;
}): Promise<void> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(
      params.calendarId
    )}/events/${encodeURIComponent(params.eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `${params.serviceTitle} – ${params.clientName}`,
        description: [
          `Klient: ${params.clientName}`,
          `E-mail: ${params.clientEmail}`,
          params.clientPhone ? `Telefon: ${params.clientPhone}` : null,
          params.description ? `Popis: ${params.description}` : null,
          `Detail zakázky: ${params.bookingUrl}`,
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: params.start.toISOString() },
        end: { dateTime: params.end.toISOString() },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Google calendar event update failed: ${res.status}`);
  }
}

export async function deleteCalendarEvent(params: {
  accessToken: string;
  calendarId: string;
  eventId: string;
}): Promise<void> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(
      params.calendarId
    )}/events/${encodeURIComponent(params.eventId)}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
    }
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google calendar event delete failed: ${res.status}`);
  }
}
