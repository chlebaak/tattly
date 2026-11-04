import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, profiles, services } from "@/db/schema";
import { variableSymbolForBooking } from "@/lib/booking-events";
import { buildDepositQr } from "@/lib/payments";
import { formatCents, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PayActions } from "./pay-actions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = {
  title: "Platba zálohy",
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

  const statusUrl = booking.statusCode
    ? `/booking/status?code=${booking.statusCode}`
    : null;

  const stateCard = (title: string, text: string) => (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-3 py-4 text-center">
          <h1 className="text-base font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{text}</p>
          <div className="flex flex-col gap-2 pt-1">
            {statusUrl && (
              <Button asChild className="w-full">
                <Link href={statusUrl}>Zobrazit stav rezervace</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Zpět na Tattly.eu</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );

  if (booking.status === "confirmed" || booking.status === "completed") {
    return stateCard(
      "Termín je potvrzen",
      `Záloha je uhrazená a termín je potvrzený. Potvrzení najdete v e-mailu.`
    );
  }
  if (
    booking.status === "expired" ||
    booking.status === "cancelled" ||
    booking.status === "rejected"
  ) {
    return stateCard(
      "Rezervace už není aktivní",
      `Tato rezervace byla zrušena nebo vypršela. Ozvěte se prosím tatérovi přímo.`
    );
  }
  if (booking.status !== "deposit_pending") {
    return stateCard(
      "Rezervace čeká na schválení",
      "Jakmile tatér poptávku schválí, přijde vám e-mail s platebními údaji."
    );
  }
  if (booking.depositExpiresAt && booking.depositExpiresAt < new Date()) {
    return stateCard(
      "Platnost vypršela",
      `Čas na zaplacení zálohy uplynul. Ozvěte se prosím tatérovi a domluvte se na novém termínu.`
    );
  }

  const variableSymbol =
    booking.variableSymbol ?? variableSymbolForBooking(booking.id);
  const qr =
    row.bankAccount && booking.depositAmount
      ? await buildDepositQr({
          iban: row.bankAccount,
          amountMinor: booking.depositAmount,
          currency: row.currency,
          variableSymbol,
          artistName: row.artistName,
        })
      : null;

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 py-2">
          <h1 className="sr-only">Platba zálohy</h1>
          <div className="space-y-1 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              Záloha za termín
            </p>
            <p className="text-3xl font-semibold tabular-nums">
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
            iban={row.bankAccount}
            variableSymbol={variableSymbol}
            amountLabel={amountLabel}
            artistName={row.artistName}
            paidMarked={Boolean(booking.clientPaidAt)}
          />

          {statusUrl && (
            <p className="text-center text-xs text-muted-foreground">
              Stav rezervace najdete na{" "}
              <Link href={statusUrl} className="underline underline-offset-4">
                tomto odkazu
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
