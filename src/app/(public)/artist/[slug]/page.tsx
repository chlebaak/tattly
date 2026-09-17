import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, services } from "@/db/schema";
import { formatCents } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingForm } from "./booking-form";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.slug, slug))
    .limit(1);
  if (!profile) notFound();

  const session = await auth();
  const isOwner = session?.user?.email === profile.email;

  const activeServices = await db
    .select()
    .from(services)
    .where(
      and(eq(services.profileId, profile.id), eq(services.isActive, true))
    );

  return (
    <main id="main" className="min-h-svh">
      <a
        href="#booking"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Přeskočit na rezervaci
      </a>
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        {isOwner && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Toto je váš veřejný profil – takto ho vidí klienti.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard">Přejít do dashboardu</Link>
            </Button>
          </div>
        )}
        <div className="flex items-center gap-4">
          <Avatar className="size-16 border">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />}
            <AvatarFallback className="text-lg font-semibold">
              {profile.displayName
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile.displayName}
            </h1>
            {profile.studioName && (
              <p className="text-sm text-muted-foreground">
                {profile.studioName}
              </p>
            )}
            {profile.bio && (
              <p className="mt-1 max-w-md whitespace-pre-line text-sm text-muted-foreground">
                {profile.bio}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {profile.city && (
                <Badge variant="outline">{profile.city}</Badge>
              )}
              {(profile.styles ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 5)
                .map((style) => (
                  <Badge key={style} variant="secondary">
                    {style}
                  </Badge>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[
                { href: profile.website, label: "Web" },
                { href: profile.instagram, label: "Instagram" },
                { href: profile.tiktok, label: "TikTok" },
                { href: profile.facebook, label: "Facebook" },
              ]
                .filter((link) => link.href)
                .map((link) => (
                  <a
                    key={link.label}
                    href={link.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {link.label}
                  </a>
                ))}
            </div>
          </div>
        </div>

        {activeServices.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="text-muted-foreground">
              Tento profesionál zatím nemá aktivní žádnou službu.
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-8" id="booking">
            <CardContent>
              <BookingForm
                slug={profile.slug}
                defaultDepositLabel={formatCents(
                  profile.defaultDepositAmount,
                  profile.currency
                )}
                services={activeServices.map((s) => ({
                  id: s.id,
                  title: s.title,
                  durationMinutes: s.durationMinutes,
                  priceMinor: s.priceMinor,
                  depositMinor: s.depositMinor,
                  customFormFields: s.customFormFields,
                }))}
              />
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Rezervace přes{" "}
          <Link href="/" className="underline-offset-4 hover:underline">
            Tattly
          </Link>{" "}
          – termín se zablokuje až po uhrazení zálohy.
        </p>
      </div>
    </main>
  );
}
