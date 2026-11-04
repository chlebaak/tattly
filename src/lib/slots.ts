export type Slot = { start: Date; end: Date };

export type BusyInterval = { start: Date; end: Date };

function overlaps(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
): boolean {
  return a.start < b.end && b.start < a.end;
}

export function generateSlotsForWindow(params: {
  windowStart: Date;
  windowEnd: Date;
  durationMinutes: number;
  intervalMinutes: number;
  busy: BusyInterval[];
  earliestStart?: Date;
}): Slot[] {
  const { windowStart, windowEnd, durationMinutes, intervalMinutes, busy } =
    params;
  const earliestStart = params.earliestStart ?? new Date(0);
  const slots: Slot[] = [];
  let cursor = new Date(windowStart);
  while (cursor < windowEnd) {
    const end = new Date(cursor.getTime() + durationMinutes * 60_000);
    if (end > windowEnd) break;
    if (
      cursor >= earliestStart &&
      !busy.some((b) => overlaps(b, { start: cursor, end }))
    ) {
      slots.push({ start: new Date(cursor), end: new Date(end) });
    }
    cursor = new Date(cursor.getTime() + intervalMinutes * 60_000);
  }
  return slots;
}

/**
 * Efektivní rozestup startů: služba → výchozí nastavení → délka služby.
 * Jediné místo, které určuje, jak často mohou termíny začínat – používají
 * ho veřejné sloty, náhledy v nastavení i nabídky při schvalování.
 */
export function resolveSlotInterval(
  rules: { slotIntervalMinutes?: number | null } | null | undefined,
  service?: {
    durationMinutes?: number | null;
    slotIntervalMinutes?: number | null;
  } | null
): number {
  const own = service?.slotIntervalMinutes;
  if (own && own >= 5) return own;
  const fallback = rules?.slotIntervalMinutes;
  if (fallback && fallback >= 5) return fallback;
  return Math.max(5, service?.durationMinutes ?? 30);
}
