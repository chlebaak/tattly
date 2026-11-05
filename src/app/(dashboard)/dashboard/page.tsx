import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { and, desc, eq, isNull } from "drizzle-orm";
import { CalendarXIcon } from "lucide-react";
import { db } from "@/db";
import { bankConnections, bankTransactions } from "@/db/schema";
import { appUrl } from "@/lib/env";
import {
  buildActionQueue,
  getDayAgenda,
  getMonthMoney,
  getNextAppointment,
  getRefunds,
} from "@/lib/dashboard";
import { getOnboarding } from "@/lib/onboarding";
import { buildRefundQr } from "@/lib/payments";
import { requireProfile } from "@/lib/session";
import { formatCents, plural } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActionQueue } from "./action-queue";
import { DayAgenda } from "./day-agenda";
import { MoneySummary } from "./money-summary";
import { NextAppointment, ShareProfileButton } from "./next-appointment";
import { SetupCard } from "./setup-card";
import { RefundTask } from "./attention-tasks";
import { UnmatchedPayments } from "./unmatched-payments";
import { getDashboardData } from "./data";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [{ bookingsView }, onboarding] = await Promise.all([
    getDashboardData(profile),
    getOnboarding(profile),
  ]);

  const tz = profile.timezone || "Europe/Prague";
  const now = new Date();
  const todayKey = formatInTimeZone(now, tz, "yyyy-MM-dd");
  const tomorrowKey = formatInTimeZone(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
    tz,
    "yyyy-MM-dd"
  );
  const monthPrefix = todayKey.slice(0, 7);

  const next = getNextAppointment(bookingsView, now);
  const today = getDayAgenda(bookingsView, todayKey);
  const tomorrow = getDayAgenda(bookingsView, tomorrowKey);
  const actionQueue = buildActionQueue(bookingsView);
  const refunds = getRefunds(bookingsView);
  const money = getMonthMoney(bookingsView, monthPrefix, now);

  const unmatchedRows = await db
    .select({
      id: bankTransactions.id,
      amount: bankTransactions.amount,
      currency: bankTransactions.currency,
      variableSymbol: bankTransactions.variableSymbol,
      message: bankTransactions.message,
      counterpartyAccount: bankTransactions.counterpartyAccount,
      bookedAt: bankTransactions.bookedAt,
    })
    .from(bankTransactions)
    .innerJoin(
      bankConnections,
      eq(bankTransactions.connectionId, bankConnections.id)
    )
    .where(
      and(
        eq(bankConnections.profileId, profile.id),
        isNull(bankTransactions.bookingId),
        eq(bankTransactions.direction, "in")
      )
    )
    .orderBy(desc(bankTransactions.bookedAt))
    .limit(10);

  const unmatchedPayments = unmatchedRows.map((row) => ({
    id: row.id,
    bookedAtLabel: new Intl.DateTimeFormat("cs-CZ", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: tz,
    }).format(row.bookedAt),
    amountLabel: formatCents(row.amount, row.currency),
    amountMinor: row.amount,
    variableSymbol: row.variableSymbol,
    message: row.message,
    counterpartyAccount: row.counterpartyAccount,
  }));

  const depositCandidates = bookingsView
    .filter((booking) => booking.status === "deposit_pending")
    .map((booking) => ({
      id: booking.id,
      label: [
        booking.clientName,
        booking.serviceTitle,
        booking.startLabel,
        booking.depositAmount
          ? formatCents(booking.depositAmount)
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      amountMinor: booking.depositAmount,
    }));

  const refundQrs = new Map<string, string | null>();
  await Promise.all(
    refunds
      .filter((booking) => booking.clientIban && booking.payment)
      .map(async (booking) => {
        const qr = await buildRefundQr({
          iban: booking.clientIban!,
          amountMinor: booking.payment!.amount,
          currency: booking.payment!.currency,
          variableSymbol: booking.variableSymbol,
          artistName: profile.displayName,
        });
        refundQrs.set(booking.id, qr.dataUri);
      })
  );

  const attentionCount =
    actionQueue.length + refunds.length + unmatchedPayments.length;

  const hasActivity =
    Boolean(next) ||
    today.length > 0 ||
    tomorrow.length > 0 ||
    attentionCount > 0 ||
    money.revenue > 0 ||
    money.expected > 0 ||
    money.unpaid > 0;

  const summary = (() => {
    const tasks =
      attentionCount > 0
        ? `Máte ${attentionCount} ${plural(
            attentionCount,
            "úkol",
            "úkoly",
            "úkolů"
          )}.`
        : null;
    const day =
      today.length > 0
        ? `Dnes máte ${today.length} ${plural(
            today.length,
            "termín",
            "termíny",
            "termínů"
          )}.`
        : next
          ? `Dnes volno. Nejbližší termín ${nextDayLabel(next, todayKey, tomorrowKey, tz)} v ${next.startTimeLabel}.`
          : "Dnes žádné termíny.";
    const done =
      attentionCount === 0 && today.length > 0
        ? " Vše ostatní je vyřízené."
        : "";
    if (!hasActivity) {
      return "Zatím žádné aktivní rezervace. Sdílejte profil a první poptávka může přijít dnes.";
    }
    return [tasks, day].filter(Boolean).join(" ") + done;
  })();

  const endTimeLabel =
    next?.startTimeIso && next.durationMinutes
      ? formatInTimeZone(
          new Date(
            new Date(next.startTimeIso).getTime() +
              next.durationMinutes * 60_000
          ),
          tz,
          "HH:mm"
        )
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("cs-CZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: tz,
        }).format(now)}
        title="Dobrý den."
        description={summary}
        actions={
          hasActivity ? (
            <ShareProfileButton url={`${appUrl()}/artist/${profile.slug}`} />
          ) : undefined
        }
      />

      {!onboarding.complete ? <SetupCard onboarding={onboarding} /> : null}

      {profile.googleNeedsReconnect ? (
        <div className="flex animate-enter flex-wrap items-start gap-3 rounded-[14px] border border-status-attention/25 bg-status-attention-soft/60 px-4 py-3">
          <CalendarXIcon className="mt-0.5 size-4 shrink-0 text-status-attention" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Kalendář se odpojil</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Google odvolal přístup, takže termíny z vašeho kalendáře teď
              neblokujeme. Připojte ho znovu, ať se rezervace nepotkávají s
              vaším programem.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/integrations">Připojit znovu</Link>
          </Button>
        </div>
      ) : null}

      {hasActivity ? (
        <>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="animate-enter lg:col-span-7">
              <NextAppointment
                booking={next}
                dayLabel={
                  next ? nextDayLabel(next, todayKey, tomorrowKey, tz) : null
                }
                endTimeLabel={endTimeLabel}
                empty={{
                  title: "Zatím žádný potvrzený termín.",
                  description:
                    "Jakmile potvrdíte poptávku, objeví se tady i s časem a zálohou.",
                  href: "/dashboard/bookings?filtr=pending_review",
                  action: "Otevřít rezervace",
                }}
              />
            </div>
            <div className="animate-enter lg:col-span-5" style={{ animationDelay: "60ms" }}>
              <ActionQueue items={actionQueue} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="animate-enter lg:col-span-7" style={{ animationDelay: "100ms" }}>
              <DayAgenda
                today={today}
                tomorrow={tomorrow}
                nextId={next?.id ?? null}
              />
            </div>
            <div className="animate-enter lg:col-span-5" style={{ animationDelay: "140ms" }}>
              <MoneySummary
                money={money}
                currency={profile.currency}
                href="/dashboard/stats"
              />
            </div>
          </div>

          {refunds.length > 0 || unmatchedPayments.length > 0 ? (
            <section className="animate-enter space-y-3 border-t border-border pt-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold">Platby k vyřízení</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {refunds.length + unmatchedPayments.length}
                </span>
              </div>
              {unmatchedPayments.length > 0 ? (
                <UnmatchedPayments
                  payments={unmatchedPayments}
                  candidates={depositCandidates}
                />
              ) : null}
              {refunds.map((booking) => (
                <RefundTask
                  key={booking.id}
                  booking={booking}
                  refundQr={refundQrs.get(booking.id) ?? null}
                />
              ))}
            </section>
          ) : null}
        </>
      ) : (
        <section className="animate-enter rounded-[20px] border border-border bg-card p-6 sm:p-8" style={{ animationDelay: "60ms" }}>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            První kroky
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Vše je připravené na první rezervaci.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Sdílejte odkaz na svůj profil nebo si projděte služby a dostupnost.
            Jakmile přijde první poptávka, objeví se tady.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["01", "Sdílejte profil", "Pošlete odkaz do Instagram bio nebo klientovi."],
              ["02", "Zkontrolujte služby", "Délka, cena a záloha u každé služby."],
              ["03", "Nastavte dostupnost", "Pracovní doba a volné starty."],
            ].map(([number, title, description]) => (
              <li key={number} className="border-t border-border pt-3">
                <p className="text-xs font-medium text-coffee tabular-nums">{number}</p>
                <p className="mt-2 text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <ShareProfileButton url={`${appUrl()}/artist/${profile.slug}`} />
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings/services">Upravit služby</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings/availability">Nastavit dostupnost</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function nextDayLabel(
  booking: { startDayKey: string | null; startTimeIso: string | null },
  todayKey: string,
  tomorrowKey: string,
  tz: string
): string {
  if (booking.startDayKey === todayKey) return "Dnes";
  if (booking.startDayKey === tomorrowKey) return "Zítra";
  if (!booking.startTimeIso) return "Později";
  return new Intl.DateTimeFormat("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  }).format(new Date(booking.startTimeIso));
}
