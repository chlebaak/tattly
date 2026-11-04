import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ExternalLinkIcon, MapPinIcon } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, services } from "@/db/schema";
import { hasWeeklySchedule } from "@/lib/availability";
import { formatCents } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookingForm } from "./booking-form";
import { PortfolioGallery } from "./portfolio-gallery";

const getArtistProfile = cache(async (slug: string) => {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.slug, slug))
    .limit(1);
  return profile ?? null;
});

const SOCIALS = [
  { key: "website", label: "Web" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getArtistProfile(slug);
  if (!profile) return { title: "Tatér nenalezen" };

  const styles = (profile.styles ?? "")
    .split(",")
    .map((style) => style.trim())
    .filter(Boolean)
    .slice(0, 3);
  const where = profile.city ? ` v ${profile.city}` : "";
  const styleText = styles.length ? `${styles.join(", ")}` : "tetování";
  const description =
    profile.bio?.slice(0, 160) ??
    `Rezervujte si termín${where} – ${styleText}. Online rezervace se zálohou a kalendářem.`;

  return {
    title: `${profile.displayName} – rezervace${where}`,
    description,
    alternates: { canonical: `/artist/${slug}` },
    openGraph: {
      type: "profile",
      title: `${profile.displayName}${where}`,
      description,
    },
  };
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getArtistProfile(slug);
  if (!profile) notFound();

  const session = await auth();
  const isOwner = session?.user?.email === profile.email;

  const activeServices = await db
    .select()
    .from(services)
    .where(
      and(eq(services.profileId, profile.id), eq(services.isActive, true))
    );

  const styles = (profile.styles ?? "")
    .split(",")
    .map((style) => style.trim())
    .filter(Boolean)
    .slice(0, 8);

  const socials = SOCIALS.filter((social) => profile[social.key]).map(
    (social) => ({ label: social.label, href: profile[social.key]! })
  );

  const portfolio = profile.portfolioImages ?? [];
  const bookable = hasWeeklySchedule(profile.bookingRules);
  const shortestService = activeServices
    .slice()
    .sort((a, b) => (a.depositMinor ?? 0) - (b.depositMinor ?? 0))[0];

  const depositLabel = shortestService?.depositMinor
    ? formatCents(shortestService.depositMinor)
    : formatCents(profile.defaultDepositAmount);

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-16 sm:px-6 sm:pt-10 lg:px-8"
    >
      <a
        href="#booking"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-[10px] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Přeskočit na rezervaci
      </a>

      {isOwner ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-dashed border-border px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Toto je vaše veřejná stránka – takhle ji vidí klienti.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Přejít do přehledu</Link>
          </Button>
        </div>
      ) : null}

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <Avatar className="size-20 border border-border sm:size-24">
          {profile.avatarUrl && (
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
          )}
          <AvatarFallback className="text-xl font-semibold">
            {profile.displayName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("")}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {profile.displayName}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {profile.studioName ? <span>{profile.studioName}</span> : null}
            {profile.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3.5" />
                {profile.city}
              </span>
            ) : null}
            {styles.length > 0 ? <span>{styles.join(" · ")}</span> : null}
          </p>

          {profile.bio ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {profile.bio}
            </p>
          ) : null}

          {socials.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {social.label}
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <div className="order-2 min-w-0 space-y-10 lg:order-1">
          {portfolio.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold">Portfolio</h2>
              <div className="mt-4">
                <PortfolioGallery
                  images={portfolio}
                  name={profile.displayName}
                />
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="text-sm font-semibold">Co se hodí vědět</h2>
            <dl className="mt-3 divide-y divide-border border-y border-border">
              <div className="py-4">
                <dt className="text-sm font-medium">
                  Záloha se odečte z ceny
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Záloha {depositLabel} není poplatek navíc – odečte se z
                  konečné ceny sezení.
                </dd>
              </div>
              <div className="py-4">
                <dt className="text-sm font-medium">
                  Termín blokuje až zaplacená záloha
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Do té doby je termín jen předběžný. Když se záloha neuhradí,
                  uvolní se po 24 hodinách.
                </dd>
              </div>
              <div className="py-4">
                <dt className="text-sm font-medium">Když se to změní</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Termín jde přesunout nebo zrušit – stačí napsat na e-mail
                  nebo zavolat na telefon, který najdete v potvrzení.
                </dd>
              </div>
              {profile.addressLine ? (
                <div className="py-4">
                  <dt className="text-sm font-medium">Kde se sejdeme</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Adresu dostanete e-mailem po zaplacení zálohy.
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>

        <div
          id="booking"
          className="order-1 min-w-0 scroll-mt-24 lg:sticky lg:top-24 lg:order-2"
        >
          {activeServices.length === 0 || !bookable ? (
            <div className="rounded-[20px] border border-border bg-card p-8 text-center">
              <p className="font-medium">Rezervace zatím nejsou otevřené</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeServices.length === 0
                  ? "Tatér ještě nepřidal žádnou službu."
                  : "Tatér si ještě nenastavil volné termíny."}
              </p>
            </div>
          ) : (
            <div className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
              <BookingForm
                slug={profile.slug}
                services={activeServices.map((service) => ({
                  id: service.id,
                  title: service.title,
                  durationMinutes: service.durationMinutes,
                  priceMinor: service.priceMinor,
                  depositMinor: service.depositMinor,
                  customFormFields: service.customFormFields,
                }))}
                defaultDepositLabel={depositLabel}
                artistTimezone={profile.timezone}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
