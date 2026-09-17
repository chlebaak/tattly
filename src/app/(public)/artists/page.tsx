import Link from "next/link";
import { and, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { profiles, services } from "@/db/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArtistsSearch } from "./artists-search";

type Props = {
  searchParams: Promise<{ q?: string; city?: string }>;
};

export default async function ArtistsPage({ searchParams }: Props) {
  const { q, city } = await searchParams;
  const query = (q ?? "").trim();
  const cityFilter = (city ?? "").trim();

  const conditions = [];
  if (query) conditions.push(ilike(profiles.displayName, `%${query}%`));
  if (cityFilter) conditions.push(ilike(profiles.city, `%${cityFilter}%`));

  const artists = await db
    .select()
    .from(profiles)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(profiles.displayName)
    .limit(24);

  const serviceRows = artists.length
    ? await db
        .select({ profileId: services.profileId, title: services.title })
        .from(services)
        .where(
          and(
            inArray(
              services.profileId,
              artists.map((a) => a.id)
            ),
            eq(services.isActive, true)
          )
        )
    : [];
  const servicesByProfile = new Map<string, string[]>();
  for (const row of serviceRows) {
    const list = servicesByProfile.get(row.profileId) ?? [];
    list.push(row.title);
    servicesByProfile.set(row.profileId, list);
  }

  return (
    <main className="min-h-svh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-extrabold uppercase tracking-[0.08em]">
            Tattly.eu
          </span>
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Pro profesionály</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Vyber si podle města nebo jména
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-6xl">
          Najdi si svého <em>tatéra.</em>
        </h1>

        <div className="mt-8 max-w-2xl">
          <ArtistsSearch initialQ={query} initialCity={cityFilter} />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {artists.length === 0 ? (
            <Card>
              <CardContent className="text-sm text-muted-foreground">
                Nic jsme nenašli. Zkus jiné město nebo jméno.
              </CardContent>
            </Card>
          ) : (
            artists.map((artist) => {
              const chips = servicesByProfile.get(artist.id) ?? [];
              return (
                <Card key={artist.id}>
                  <CardContent className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="size-12 border">
                        <AvatarFallback className="font-semibold">
                          {artist.displayName
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-display text-lg font-semibold tracking-tight">
                          {artist.displayName}
                        </p>
                        {artist.city && (
                          <Badge variant="outline" className="mt-1">
                            {artist.city}
                          </Badge>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {chips.slice(0, 3).map((title) => (
                            <Badge key={title} variant="secondary">
                              {title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/artist/${artist.slug}`}>Rezervovat</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
