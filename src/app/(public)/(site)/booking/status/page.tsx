import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import {
  CalendarIcon,
  CalendarPlusIcon,
  CheckIcon,
  CreditCardIcon,
  InfoIcon,
  MailIcon,
  MapPinIcon,
} from "lucide-react";
import { db } from "@/db";
import { bookingEvents, bookings, payments, profiles, services } from "@/db/schema";
import { buildDepositQr } from "@/lib/payments";
import { variableSymbolForBooking } from "@/lib/booking-events";
import { formatCents, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { PayActions } from "@/app/(public)/(site)/pay/[bookingId]/pay-actions";
import {
  ClientRequestActions,
  RefundIbanForm,
  StatusCodeLookup,
} from "./client-actions";

export const metadata = {
  title: "Stav rezervace",
  robots: { index: false },
};

const EVENT_COPY: Record<string, { title: string }> = {
  created: { title: "Poptávka odeslána" },
  approved: { title: "Termín schválen" },
  deposit_sent: { title: "Odeslali jsme odkaz na zálohu" },
  deposit_marked_paid: { title: "Označili jste platbu jako odeslanou" },
  deposit_paid: { title: "Záloha přijata" },  confirmed: { title: "Termín potvrzen" },
  reminder: { title: "Odeslali jsme připomínku" },
  rescheduled: { title: "Termín přesunut" },
  completed: { title: "Sezení proběhlo" },
  cancelled: { title: "Rezervace zrušena" },
  rejected: { title: "Poptávka odmítnuta" },
  expired: { title: "Platnost rezervace vypršela" },
  refund_requested: { title: "Záloha k vrácení" },
  refunded: { title: "Záloha vrácena" },
  message: { title: "Zpráva od tatéra" },
  request: { title: "Váš požadavek" },
  request_resolved: { title: "Požadavek vyřízen" },
  assets_purged: { title: "Fotky a odpovědi smazány" },
};

function clientNextStep(status: string): string {
  switch (status) {
    case "pending_review":
      return "Poptávku teď posuzuje tatér. Jakmile ji schválí, přijde vám e-mail s odkazem na zálohu.";
    case "deposit_pending":
      return "Zaplaťte prosím zálohu – termín se zablokuje až po jejím přijetí. Pak dostanete potvrzení.";
    case "confirmed":
      return "Termín je potvrzený. Den předem vám pošleme připomínku s adresou.";
    case "completed":
      return "Sezení proběhlo. Díky za návštěvu!";
    case "cancelled":
      return "Rezervace je zrušená. Nový termín si můžete domluvit přímo s tatérem.";
    case "rejected":
      return "Tatér poptávku tentokrát nepřijal. Můžete zkusit jiný termín nebo jiného tatéra.";
    case "expired":
      return "Záloha nedorazila včas, takže se termín uvolnil. Můžete si vybrat nový termín.";
    default:
      return "";
  }
}

export default async function BookingStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const normalized = code?.trim().toUpperCase().replace(/\s+/g, "") ?? "";

  if (!normalized) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <Card>
          <CardContent className="space-y-4 py-2">
            <div className="space-y-1 text-center">
              <h1 className="text-base font-semibold">Stav rezervace</h1>
              <p className="text-sm text-muted-foreground">
                Zadejte kód z e-mailu a uvidíte, co se s vaší rezervací děje.
              </p>
            </div>
            <StatusCodeLookup />
          </CardContent>
        </Card>
      </main>
    );
  }

  const [row] = await db
    .select({
      booking: bookings,
      artistName: profiles.displayName,
      artistEmail: profiles.email,
      timezone: profiles.timezone,
      currency: profiles.currency,
      bankAccount: profiles.bankAccount,
      addressLine: profiles.addressLine,
      city: profiles.city,
      zip: profiles.zip,
      serviceTitle: services.title,
    })
    .from(bookings)
    .innerJoin(profiles, eq(bookings.profileId, profiles.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.statusCode, normalized))
    .limit(1);

  if (!row) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <Card>
          <CardContent className="space-y-4 py-2">
            <div className="space-y-1 text-center">
              <h1 className="text-base font-semibold">
                Tenhle kód jsme nenašli
              </h1>
              <p className="text-sm text-muted-foreground">
                Zkontrolujte prosím, zda nejde o překlep – kód má tvar např. ZU4S-MU5K.
              </p>
            </div>
            <StatusCodeLookup initialCode={normalized} />
          </CardContent>
        </Card>
      </main>
    );
  }

  const { booking } = row;
  const [events, paymentRows] = await Promise.all([
    db
      .select()
      .from(bookingEvents)
      .where(eq(bookingEvents.bookingId, booking.id))
      .orderBy(asc(bookingEvents.createdAt)),
    db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, booking.id))
      .orderBy(desc(payments.createdAt)),
  ]);

  const paidPayment = paymentRows.find((p) => p.status === "succeeded") ?? null;
  const refundedPayment =
    paymentRows.find((p) => p.status === "refunded") ?? null;
  const needsIban =
    booking.status === "cancelled" &&
    Boolean(paidPayment) &&
    !refundedPayment &&
    !booking.clientIban;
  const refundWaiting =
    booking.status === "cancelled" &&
    Boolean(paidPayment) &&
    !refundedPayment &&
    Boolean(booking.clientIban);

  const depositPending =
    booking.status === "deposit_pending" &&
    (booking.depositAmount ?? 0) > 0 &&
    (!booking.depositExpiresAt || booking.depositExpiresAt > new Date());

  const variableSymbol =
    booking.variableSymbol ?? variableSymbolForBooking(booking.id);
  const qr =
    depositPending && row.bankAccount && booking.depositAmount
      ? await buildDepositQr({
          iban: row.bankAccount,
          amountMinor: booking.depositAmount,
          currency: row.currency,
          variableSymbol,
          artistName: row.artistName,
        })
      : null;

  const canRequest =
    booking.status === "pending_review" ||
    booking.status === "deposit_pending" ||
    booking.status === "confirmed";

  const addressText =
    booking.status === "confirmed" || booking.status === "completed"
      ? [row.addressLine, row.city, row.zip].filter(Boolean).join(", ")
      : null;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <Card>
        <CardContent className="space-y-4 py-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Rezervace {booking.statusCode}
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.02em]">
                {row.booking.serviceTitle ?? row.serviceTitle ?? "Termín"} – {row.artistName}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="size-4" />
                  {booking.startTime
                    ? formatDateTime(booking.startTime, row.timezone)
                    : "termín se upřesní"}
                </span>
                {addressText && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPinIcon className="size-4" />
                    {addressText}
                  </span>
                )}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
            {clientNextStep(booking.status)}
          </p>

          {booking.depositAmount && booking.depositAmount > 0 && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCardIcon className="size-4" />
              Záloha {formatCents(booking.depositAmount, row.currency)}
              {paidPayment || refundedPayment
                ? " – uhrazena"
                : depositPending
                  ? " – čeká na úhradu"
                  : ""}
            </p>
          )}

          {(booking.status === "confirmed" ||
            booking.status === "completed") &&
            booking.startTime && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/api/booking-ics?code=${encodeURIComponent(
                    booking.statusCode ?? normalized
                  )}`}
                >
                  <CalendarPlusIcon data-icon="inline-start" />
                  Přidat do kalendáře
                </a>
              </Button>
            )}
        </CardContent>
      </Card>

      {depositPending && (
        <Card>
          <CardContent className="space-y-3 py-2">
            <p className="text-sm font-semibold">Zaplatit zálohu</p>
            <PayActions
              bookingId={booking.id}
              qrDataUri={qr?.dataUri ?? null}
              iban={row.bankAccount}
              variableSymbol={variableSymbol}
              amountLabel={formatCents(booking.depositAmount ?? 0, row.currency)}
              artistName={row.artistName}
              paidMarked={Boolean(booking.clientPaidAt)}
            />
          </CardContent>
        </Card>
      )}

      {needsIban && (
        <Card>
          <CardContent className="space-y-3 py-2">
            <p className="text-sm font-semibold">
              Vrácení zálohy{" "}
              {paidPayment
                ? formatCents(paidPayment.amount, paidPayment.currency)
                : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Rezervace byla zrušená a zálohu vám vrátíme převodem. Doplňte
              prosím číslo účtu, na které ji poslat.
            </p>
            <RefundIbanForm code={booking.statusCode ?? normalized} />
          </CardContent>
        </Card>
      )}

      {refundWaiting && (
        <p className="flex items-start gap-2 rounded-xl bg-status-waiting-soft px-3 py-2 text-sm text-status-waiting">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          Údaje pro vrácení zálohy jsme předali tatérovi – peníze pošle na účet {booking.clientIban}.
          Peníze obvykle dorazí do jednoho pracovního dne.
        </p>
      )}

      {refundedPayment && (
        <p className="flex items-start gap-2 rounded-xl bg-status-ok-soft px-3 py-2 text-sm text-status-ok">
          <CheckIcon className="mt-0.5 size-4 shrink-0" />
          Záloha byla vrácena
          {booking.clientIban ? ` na účet ${booking.clientIban}` : ""}.
        </p>
      )}

      {events.length > 0 && (
        <Card>
          <CardContent className="space-y-0 py-2">
            <p className="text-sm font-semibold">Průběh rezervace</p>
            <ol className="mt-3 space-y-4">
              {events.map((event, index) => {
                const copy = EVENT_COPY[event.type] ?? { title: event.type };
                const isLast = index === events.length - 1;
                return (
                  <li key={event.id} className="relative flex gap-3 pl-1">
                    <span className="mt-1 flex flex-col items-center">
                      <span
                        className={
                          isLast
                            ? "size-2.5 rounded-full bg-foreground"
                            : "size-2.5 rounded-full bg-foreground/25"
                        }
                      />
                    </span>
                    <span className="min-w-0 flex-1 pb-1">
                      <span className="block text-sm font-medium">
                        {copy.title}
                        {event.type === "deposit_paid" &&
                          (event.meta as { method?: string } | null)?.method ===
                            "bank" &&
                          " (automaticky z banky)"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDateTime(event.createdAt, row.timezone)}
                        {event.actor === "artist" ? " · tatér" : ""}
                      </span>
                      {event.message && (
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {event.message}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {canRequest && (
        <Card>
          <CardContent className="space-y-3 py-2">
            <p className="text-sm font-semibold">Něco se změnilo?</p>
            <p className="text-sm text-muted-foreground">
              Napište nám to jedním kliknutím – tatér dostane zprávu a ozve se
              e-mailem.
            </p>
            <ClientRequestActions
              code={booking.statusCode ?? normalized}
              hasOpenRequest={Boolean(booking.openRequest)}
              openRequestKind={booking.openRequest?.kind ?? null}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2">
          <div>
            <p className="text-sm font-semibold">Kontakt</p>
            <p className="text-sm text-muted-foreground">{row.artistName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${row.artistEmail}`}>
                <MailIcon data-icon="inline-start" />
                Napsat e-mail
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/artists">Najít jiného tatéra</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
