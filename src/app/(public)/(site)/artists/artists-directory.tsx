"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2Icon,
  MapPinIcon,
  SearchIcon,
  UserRoundSearchIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CityFilter } from "@/components/city-filter";
import { formatCents } from "@/lib/utils";
import type { ArtistCardData } from "./page";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ArtistThumb({ url, name }: { url: string | null; name: string }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <span className="flex size-full items-center justify-center text-2xl font-semibold text-muted-foreground">
        {initialsOf(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
    />
  );
}

function pluralArtists(n: number): string {
  if (n === 1) return "1 tatér";
  if (n >= 2 && n <= 4) return `${n} tatéři`;
  return `${n} tatérů`;
}

export function ArtistsDirectory({
  artists,
  total,
  hasMore,
  initialQ,
  initialCity,
  initialSort,
}: {
  artists: ArtistCardData[];
  total: number;
  hasMore: boolean;
  initialQ: string;
  initialCity: string;
  initialSort: "name" | "newest";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);
  const [sort, setSort] = useState<"name" | "newest">(initialSort);
  const [page, setPage] = useState(0);
  const firstRun = useRef(true);

  function buildUrl(
    nextQ: string,
    nextCity: string,
    nextSort: string,
    nextPage: number
  ): string {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextCity.trim()) params.set("city", nextCity.trim());
    if (nextSort !== "name") params.set("sort", nextSort);
    if (nextPage > 0) params.set("page", String(nextPage));
    const search = params.toString();
    return search ? `/artists?${search}` : "/artists";
  }

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      startTransition(() => {
        router.replace(buildUrl(q, city, sort, 0), { scroll: false });
        setPage(0);
      });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, sort]);

  const hasFilters = Boolean(q.trim() || city.trim() || sort !== "name");

  return (
    <>
      <div className="mt-8 grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Jméno, studio nebo styl…"
            aria-label="Hledat tatéra"
            autoComplete="off"
            className="pr-9 pl-9"
          />
          {pending ? (
            <Loader2Icon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <CityFilter
          id="artist-city"
          value={city}
          onChange={setCity}
          placeholder="Město (např. Praha)"
        />
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as "name" | "newest")}
        >
          <SelectTrigger aria-label="Řazení" className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="name">Podle jména</SelectItem>
            <SelectItem value="newest">Nejnovější</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {pluralArtists(total)}
          {hasFilters
            ? total === 1
              ? " odpovídá filtru"
              : " odpovídají filtru"
            : ""}
        </p>
        {hasFilters ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setQ("");
              setCity("");
              setSort("name");
            }}
          >
            Zrušit filtry
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-4 grid gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3",
          pending && "opacity-60"
        )}
      >
        {artists.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              icon={UserRoundSearchIcon}
              title="Nikoho jsme nenašli"
              description="Zkuste jiné město, jméno nebo styl. Nebo si projděte všechny tatéry."
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setCity("");
                  }}
                >
                  Zrušit filtry
                </Button>
              }
            />
          </div>
        ) : (
          artists.map((artist) => (
            <Link
              key={artist.slug}
              href={`/artist/${artist.slug}`}
              className="group flex flex-col overflow-hidden rounded-[18px] border border-border bg-card transition-colors hover:border-coffee/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="aspect-[4/5] w-full overflow-hidden bg-muted">
                <ArtistThumb url={artist.imageUrl} name={artist.displayName} />
              </span>

              <span className="flex flex-1 flex-col p-4">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold">
                      {artist.displayName}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {artist.city ? (
                        <MapPinIcon className="size-3.5" />
                      ) : null}
                      <span className="truncate">
                        {[artist.studioName, artist.city]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </span>
                  </span>
                </span>

                {artist.styles.length > 0 ? (
                  <span className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                    {artist.styles.join(" · ")}
                  </span>
                ) : null}

                <span className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-4 text-xs text-muted-foreground">
                  <span>
                    {artist.serviceCount > 0
                      ? `${artist.serviceCount} ${
                          artist.serviceCount === 1
                            ? "služba"
                            : artist.serviceCount < 5
                              ? "služby"
                              : "služeb"
                        }`
                      : "Bez služeb"}
                    {artist.fromPriceMinor !== null
                      ? ` · od ${formatCents(artist.fromPriceMinor)}`
                      : ""}
                  </span>
                  {artist.bookable ? (
                    <span className="inline-flex items-center gap-1.5 text-status-ok">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-status-ok"
                      />
                      Přijímá rezervace
                    </span>
                  ) : (
                    <span>Bez volných termínů</span>
                  )}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>

      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              const next = page + 1;
              setPage(next);
              startTransition(() => {
                router.push(buildUrl(q, city, sort, next), { scroll: false });
              });
            }}
          >
            {pending ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : null}
            Zobrazit další ({total - artists.length})
          </Button>
        </div>
      ) : null}
    </>
  );
}
