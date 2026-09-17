import { createEvent, type EventAttributes } from "ics";

export type IcsInput = {
  uid: string;
  title: string;
  start: Date;
  durationMinutes: number;
  description?: string | null;
  location?: string | null;
  organizerName: string;
  organizerEmail: string;
  attendeeName: string;
  attendeeEmail: string;
};

export type IcsAttachment = { filename: string; content: string };

export async function buildIcsAttachment(
  input: IcsInput
): Promise<IcsAttachment | null> {
  const utc = input.start;
  const event: EventAttributes = {
    uid: input.uid,
    title: input.title,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
    startInputType: "utc",
    start: [
      utc.getUTCFullYear(),
      utc.getUTCMonth() + 1,
      utc.getUTCDate(),
      utc.getUTCHours(),
      utc.getUTCMinutes(),
    ],
    duration: {
      hours: Math.floor(input.durationMinutes / 60),
      minutes: input.durationMinutes % 60,
    },
    status: "CONFIRMED",
    organizer: { name: input.organizerName, email: input.organizerEmail },
    attendees: [
      { name: input.attendeeName, email: input.attendeeEmail, rsvp: true },
    ],
  };
  const { error, value } = createEvent(event);
  if (error || !value) {
    console.error("ICS build failed", error);
    return null;
  }
  return {
    filename: "termin.ics",
    content: Buffer.from(value).toString("base64"),
  };
}
