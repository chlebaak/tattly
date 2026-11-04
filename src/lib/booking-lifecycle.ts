import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { bookingAssets, bookings } from "@/db/schema";
import { logBookingEvent } from "@/lib/booking-events";
import { deleteObjects, listObjectsPage } from "@/lib/r2";
import type { BookingStatus } from "@/lib/bookings";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Prefix v bucketu, který patří výhradně přílohám rezervací. */
export const BOOKING_ASSETS_PREFIX = "booking-assets/";

/**
 * Lhůty úklidu citlivých dat (referenční fotky + odpovědi z dotazníku).
 * Odpovídají textu v zásadách ochrany osobních údajů – při změně upravte obojí.
 */
export const ASSET_RETENTION = {
  /** Dní po odmítnutí, zrušení nebo vypršení rezervace. */
  terminalGraceDays: 14,
  /** Dní po splnění (tatér může reference potřebovat k dořešení). */
  completedGraceDays: 30,
  /** Tvrdý strop od vzniku rezervace, i kdyby běžela dál. */
  capDays: 365,
  /** Osiřelé soubory z nedokončených formulářů. */
  orphanGraceDays: 30,
} as const;

/**
 * Kdy má úklid proběhnout. U aktivních stavů vrací jen tvrdý strop, u
 * koncových stavů kratší z lhůt (lhůta po ukončení vs. strop od vzniku).
 */
export function assetsPurgeAfterFor(
  status: BookingStatus,
  createdAt: Date,
  now = new Date()
): Date {
  const cap = new Date(createdAt.getTime() + ASSET_RETENTION.capDays * DAY_MS);
  const graceDays =
    status === "completed"
      ? ASSET_RETENTION.completedGraceDays
      : status === "rejected" ||
          status === "cancelled" ||
          status === "expired"
        ? ASSET_RETENTION.terminalGraceDays
        : null;
  if (graceDays === null) return cap;
  const grace = new Date(now.getTime() + graceDays * DAY_MS);
  return grace.getTime() < cap.getTime() ? grace : cap;
}

export type PurgeBookingAssetsResult = {
  bookings: number;
  assetsDeleted: number;
  answersCleared: number;
};

/**
 * Smaže fotky a odpovědi z dotazníku u rezervací, kterým vypršela lhůta.
 * Idempotentní: co je jednou smazané, se při dalším běhu přeskočí; když
 * selže R2, záznam zůstane „k úklidu" a dohoní ho další běh.
 */
export async function purgeDueBookingAssets(options?: {
  limit?: number;
  now?: Date;
}): Promise<PurgeBookingAssetsResult> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const now = options?.now ?? new Date();

  const due = await db
    .select({ id: bookings.id, formData: bookings.formData })
    .from(bookings)
    .where(
      and(
        isNotNull(bookings.assetsPurgeAfter),
        lte(bookings.assetsPurgeAfter, now)
      )
    )
    .orderBy(bookings.assetsPurgeAfter)
    .limit(limit);

  let assetsDeleted = 0;
  let answersCleared = 0;

  for (const booking of due) {
    const assetRows = await db
      .select({ storagePath: bookingAssets.storagePath })
      .from(bookingAssets)
      .where(eq(bookingAssets.bookingId, booking.id));

    // Pojistka: mažeme výhradně klíče z prefixu příloh rezervací.
    const keys = assetRows
      .map((row) => row.storagePath)
      .filter((key) => key.startsWith(BOOKING_ASSETS_PREFIX));

    if (keys.length) {
      const result = await deleteObjects(keys, { strict: true });
      assetsDeleted += result.deleted;
    }

    const answerCount = Object.keys(booking.formData ?? {}).length;

    await db.transaction(async (tx) => {
      await tx
        .delete(bookingAssets)
        .where(eq(bookingAssets.bookingId, booking.id));
      await tx
        .update(bookings)
        .set({ formData: {}, assetsPurgeAfter: null })
        .where(eq(bookings.id, booking.id));
    });

    if (keys.length || answerCount) {
      if (answerCount) answersCleared += 1;
      await logBookingEvent({
        bookingId: booking.id,
        type: "assets_purged",
        actor: "system",
        message:
          "Referenční fotky a odpovědi z dotazníku jsme po vyřízení automaticky smazali.",
        meta: { assets: keys.length, answers: answerCount },
      });
    }
  }

  return { bookings: due.length, assetsDeleted, answersCleared };
}

export type PurgeOrphanedAssetsResult = {
  scanned: number;
  deleted: number;
};

/**
 * Uklidí soubory z nedokončených formulářů – objekty v `booking-assets/`,
 * které jsou starší než lhůta a nemají v databázi žádný záznam.
 * Trojité jištění: prefix + stáří + nepoužitost.
 */
export async function purgeOrphanedBookingAssets(options?: {
  maxPages?: number;
  pageSize?: number;
  graceDays?: number;
  now?: Date;
}): Promise<PurgeOrphanedAssetsResult> {
  // 10 × 1000 objektů za běh stačí i na mnohonásobně větší provoz; při
  // potřebě by další běh pokračoval tam, kam se dnes nedostal.
  const maxPages = Math.min(Math.max(options?.maxPages ?? 10, 1), 20);
  const pageSize = Math.min(Math.max(options?.pageSize ?? 1000, 1), 1000);
  const graceDays = options?.graceDays ?? ASSET_RETENTION.orphanGraceDays;
  const cutoff = (options?.now ?? new Date()).getTime() - graceDays * DAY_MS;

  let scanned = 0;
  let deleted = 0;
  let token: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const { objects, nextToken } = await listObjectsPage({
      prefix: BOOKING_ASSETS_PREFIX,
      continuationToken: token,
      maxKeys: pageSize,
    });
    scanned += objects.length;

    const candidates = objects.filter(
      (object) =>
        object.key &&
        (object.lastModified?.getTime() ?? Number.POSITIVE_INFINITY) < cutoff
    );

    if (candidates.length) {
      const referenced = new Set(
        (
          await db
            .select({ storagePath: bookingAssets.storagePath })
            .from(bookingAssets)
            .where(
              inArray(
                bookingAssets.storagePath,
                candidates.map((candidate) => candidate.key)
              )
            )
        ).map((row) => row.storagePath)
      );
      const orphans = candidates
        .map((candidate) => candidate.key)
        .filter((key) => !referenced.has(key));
      if (orphans.length) {
        const result = await deleteObjects(orphans, { strict: true });
        deleted += result.deleted;
      }
    }

    if (!nextToken) break;
    token = nextToken;
  }

  return { scanned, deleted };
}
