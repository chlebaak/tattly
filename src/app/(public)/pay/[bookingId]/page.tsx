import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, profiles, services } from "@/db/schema";
import { buildDepositQr } from "@/lib/payments";
import { formatCents, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PayActions } from "./pay-actions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = {
  title: "Platba zálohy – Tattly.eu",
  robots: { index: false },
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  if (!UUID_RE.test(bookingId)) notFound();

  const [row] = await db
    .select({
      booking: bookings,
      artistName: profiles.displayName,
      bankAccount: profiles.bankAccount,
      stripeAccountId: profiles.stripeAccountId,
      currency: profiles.currency,
      timezone: profiles.timezone,
      serviceTitle: services.title,
    })
    .from(bookings)
    .innerJoin(profiles, eq(bookings.profileId, profiles.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) notFound();
  const { booking } = row;

  const amountLabel = booking.depositAmount
    ? formatCents(booking.depositAmount, row.currency)
    : "";

  const stateCard = (title: string, text: string) => (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-3 py-4 text-center">
          <p className="font-display text-xl font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{text}</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Zpět na Tattly.eu</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );

  if (booking.status === "confirmed" || booking.status === "completed") {
    return stateCard(
      "Termín je potvrzen",
      `Záloha je uhrazena a termín u ${row.artistName} je potvrzený. Potvrzení najdete v e-mailu.`
    );
  }
  if (
    booking.status === "expired" ||
    booking.status === "cancelled" ||
    booking.status === "rejected"
  ) {
    return stateCard(
      "Rezervace už není aktivní",
      `Tato rezervace byla zrušena nebo vypršela. Kontaktujte prosím ${row.artistName} přímo.`
    );
  }
  if (booking.status !== "deposit_pending") {
    return stateCard(
      "Rezervace čeká na schválení",
      "Jakmile tatér poptávku schválí, přijde vám e-mail s platebními údaji."
    );
  }
  if (
    booking.depositExpiresAt &&
    booking.depositExpiresAt < new Date()
  ) {
    return stateCard(
      "Platnost vypršela",
      `Čas na zaplacení zálohy uplynul. Ozvěte se prosím ${row.artistName} a domluvte se na novém termínu.`
    );
  }

  const qr = row.bankAccount && booking.depositAmount
    ? await buildDepositQr({
        iban: row.bankAccount,
        amountMinor: booking.depositAmount,
        currency: row.currency,
        bookingId: booking.id,
        artistName: row.artistName,
      })
    : null;

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 py-2">
          <div className="space-y-1 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              Záloha za termín
            </p>
            <p className="font-display text-3xl font-bold tabular-nums">
              {amountLabel}
            </p>
            <p className="text-sm text-muted-foreground">
              {row.serviceTitle ?? "Rezervace"} · {row.artistName}
              {booking.startTime
                ? ` · ${formatDateTime(booking.startTime, row.timezone)}`
                : ""}
            </p>
            {booking.depositExpiresAt && (
              <p className="text-xs text-muted-foreground">
                Zaplatit do{" "}
                {formatDateTime(booking.depositExpiresAt, row.timezone)}
              </p>
            )}
          </div>

          <PayActions
            bookingId={booking.id}
            qrDataUri={qr?.dataUri ?? null}
            iban={qr ? row.bankAccount : null}
            variableSymbol={qr?.variableSymbol ?? null}
            amountLabel={amountLabel}
            cardAvailable={Boolean(row.stripeAccountId)}
          />

          <p className="text-center text-xs text-muted-foreground">
            Po přijetí platby termín potvrdíme a pošleme vám e-mail. Stránka se
            aktualizuje sama.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
