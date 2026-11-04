export { cn } from "cn";

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function formatCents(amountMinor: number, currency = "CZK"): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

/**
 * České skloňování podle počtu: 1 → one, 2–4 → few, 0 a 5+ → many.
 * Používej u jakéhokoli čísla vloženého do věty.
 */
export function plural(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const n = Math.abs(count);
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

export function formatDateTime(date: Date, timezone?: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Krátký kód rezervace pro klienta (např. „K7RD-2MX9“). Bez I, O, 0 a 1. */
export function generateBookingCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}
