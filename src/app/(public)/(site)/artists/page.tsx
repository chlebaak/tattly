import type { Metadata } from "next";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles, services } from "@/db/schema";
import { hasWeeklySchedule } from "@/lib/availability";
import { ArtistsDirectory } from "./artists-directory";

const PAGE_SIZE = 24;

export type ArtistCardData = {
  slug: string;
  displayName: string;
  studioName: string | null;
  city: string | null;
  styles: string[];
  serviceTitles: string[];
  serviceCount: number;
  fromPriceMinor: number | null;
  imageUrl: string | null;
  bookable: boolean;
};

type Props = {
  searchParams: Promise<{
    q?: string;
    city?: string;
    sort?: string;
    page?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Najděte tatéra",
  description:
    "Prohlédněte si tatéry a jejich volné termíny. Filtr podle města a stylu, rezervace online se zálohou.",
  alternates: { canonical: "/artists" },
};

export default async function ArtistsPage({ searchParams }: Props) {
  const { q, city, sort, page } = await searchParams;
  const query = (q ?? "").trim();
  const cityFilter = (city ?? "").trim();
  const sortKey = sort === "newest" ? "newest" : "name";
  const pageNumber = Math.max(0, Number.parseInt(page ?? "0", 10) || 0);
  const limit = PAGE_SIZE * (pageNumber + 1);

  const filters = [
    sql`exists (select 1 from ${services} where ${services.profileId} = ${profiles.id} and ${services.isActive})`,
  ];
  if (query) {
    const needle = `%${query}%`;
    filters.push(
      or(
        ilike(profiles.displayName, needle),
        ilike(profiles.studioName, needle),
        ilike(profiles.city, needle),
        ilike(profiles.styles, needle),
        ilike(profiles.bio, needle)
      )!
    );
  }
  if (cityFilter) {
    filters.push(ilike(profiles.city, `%${cityFilter}%`));
  }
  const where = and(...filters);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(profiles)
      .where(where)
      .orderBy(
        sortKey === "newest"
          ? desc(profiles.createdAt)
          : profiles.displayName
      )
      .limit(limit),
    db.select({ value: count() }).from(profiles).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);

  const serviceRows = rows.length
    ? await db
        .select({
          profileId: services.profileId,
          title: services.title,
          priceMinor: services.priceMinor,
        })
        .from(services)
        .where(
          and(
            inArray(
              services.profileId,
              rows.map((row) => row.id)
            ),
            eq(services.isActive, true)
          )
        )
    : [];

  const servicesByProfile = new Map<
    string,
    { titles: string[]; fromPrice: number | null }
  >();
  for (const row of serviceRows) {
    const entry = servicesByProfile.get(row.profileId) ?? {
      titles: [],
      fromPrice: null,
    };
    entry.titles.push(row.title);
    if (row.priceMinor && row.priceMinor > 0) {
      entry.fromPrice =
        entry.fromPrice === null
          ? row.priceMinor
          : Math.min(entry.fromPrice, row.priceMinor);
    }
    servicesByProfile.set(row.profileId, entry);
  }

  const artists: ArtistCardData[] = rows.map((row) => {
    const service = servicesByProfile.get(row.id);
    const portfolioImage = row.portfolioImages?.[0]?.key;
    return {
      slug: row.slug,
      displayName: row.displayName,
      studioName: row.studioName,
      city: row.city,
      styles: (row.styles ?? "")
        .split(",")
        .map((style) => style.trim())
        .filter(Boolean)
        .slice(0, 3),
      serviceTitles: service?.titles.slice(0, 3) ?? [],
      serviceCount: service?.titles.length ?? 0,
      fromPriceMinor: service?.fromPrice ?? null,
      imageUrl: portfolioImage
        ? `/api/files/${portfolioImage}`
        : (row.avatarUrl ?? null),
      bookable: hasWeeklySchedule(row.bookingRules),
    };
  });

  const hasMore = rows.length < total;

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-16 sm:px-6 lg:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Vyberte podle města nebo stylu
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
        Najděte svého tatéra.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Prohlédněte si práci tatérů, jejich styly a volné termíny. Rezervace
        proběhne online se zálohou.
      </p>

      <ArtistsDirectory
        artists={artists}
        total={total}
        hasMore={hasMore}
        initialQ={query}
        initialCity={cityFilter}
        initialSort={sortKey}
      />
    </main>
  );
}
