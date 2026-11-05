import Link from "next/link";
import { ArrowDownRightIcon, ArrowUpRightIcon, BarChart3Icon } from "lucide-react";
import { cn } from "cn";
import { requireProfile } from "@/lib/session";
import { getStats, parseStatsPeriod, STATS_PERIODS } from "@/lib/stats";
import { formatCents, plural } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  BarSeries,
  LineSeries,
  RankBars,
  StatusMixBar,
} from "@/components/stats/charts";

type Props = {
  searchParams: Promise<{ period?: string }>;
};

const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
/** extract(dow) má 0 = neděle; zobrazujeme od pondělí. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function panel(children: React.ReactNode, className?: string) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-border bg-card p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        positive ? "text-status-ok" : "text-status-attention"
      )}
    >
      {positive ? (
        <ArrowUpRightIcon className="size-3" />
      ) : (
        <ArrowDownRightIcon className="size-3" />
      )}
      {Math.abs(value)} %
    </span>
  );
}

function Metric({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint: string;
  delta?: number | null;
}) {
  return (
    <div className="bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">{hint}</p>
        <Delta value={delta ?? null} />
      </div>
    </div>
  );
}

export default async function StatsPage({ searchParams }: Props) {
  const profile = await requireProfile();
  const { period: rawPeriod } = await searchParams;
  const period = parseStatsPeriod(rawPeriod);
  const data = await getStats(profile, period);
  const tz = profile.timezone || "Europe/Prague";
  const currency = profile.currency;

  const cancelled =
    data.current.statuses.cancelled +
    data.current.statuses.rejected +
    data.current.statuses.expired;

  const days = DAY_ORDER.map((dow, index) => ({
    label: DAY_LABELS[index]!,
    value: data.byDayOfWeek[dow] ?? 0,
  }));
  const hours = data.byHour.map((value, hour) => ({
    label: `${String(hour).padStart(2, "0")}:00`,
    value,
  }));

  const hasSchedule = Boolean(
    profile.bookingRules?.weeklySchedule &&
      Object.values(profile.bookingRules.weeklySchedule).some(
        (windows) => windows.length > 0
      )
  );
  const hasData = data.current.sessions > 0 || data.current.created > 0;

  const periodControl = (
    <div
      aria-label="Období statistik"
      className="-mx-4 flex min-w-0 max-w-full gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {STATS_PERIODS.map((item) => {
        const active = item.key === period;
        return (
          <Link
            key={item.key}
            href={`/dashboard/stats?period=${item.key}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-9 shrink-0 items-center rounded-[10px] px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiky"
        description={`${data.label} · podle data sezení (${tz})`}
        actions={periodControl}
      />

      {!hasData ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-border px-6 py-16 text-center">
          <BarChart3Icon className="size-7 text-muted-foreground" />
          <div>
            <p className="font-medium">Za toto období zatím žádná data</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Statistiky se naplní, jakmile přijdou první rezervace.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium underline underline-offset-4"
          >
            Zpět na přehled
          </Link>
        </div>
      ) : (
        <>
          <div className="animate-enter grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-border bg-border lg:grid-cols-4">
            <Metric
              label="Rezervace"
              value={String(data.current.sessions)}
              hint={`${data.current.created} ${plural(
                data.current.created,
                "nová poptávka",
                "nové poptávky",
                "nových poptávek"
              )}`}
              delta={percentDelta(
                data.current.sessions,
                data.previous.sessions
              )}
            />
            <Metric
              label="Dokončené"
              value={String(data.current.completed)}
              hint={`${data.current.statuses.confirmed} potvrzených čeká`}
              delta={percentDelta(
                data.current.completed,
                data.previous.completed
              )}
            />
            <Metric
              label="Výdělek"
              value={formatCents(data.current.revenue, currency)}
              hint={`průměr ${formatCents(data.averageTicket, currency)}`}
              delta={percentDelta(
                data.current.revenue,
                data.previous.revenue
              )}
            />
            <Metric
              label="Obsazenost"
              value={data.capacityMinutes > 0 ? `${data.occupancy} %` : "—"}
              hint={
                data.capacityMinutes > 0
                  ? `${Math.round(data.bookedMinutes / 60)} h z ${Math.round(
                      data.capacityMinutes / 60
                    )} h`
                  : hasSchedule
                    ? "V období zatím žádná kapacita"
                    : "Nastavte pracovní dobu"
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            {panel(
              <>
                <div className="mb-3">
                  <p className="text-sm font-semibold">Rezervace v čase</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Obsazené termíny – potvrzené, dokončené i čekající na
                    zálohu.
                  </p>
                </div>
                <BarSeries
                  data={data.series.map((point) => ({
                    label: point.label,
                    value: point.count,
                  }))}
                  formatValue={(value) => String(value)}
                  caption="Počet rezervací v čase"
                />
              </>
            )}
            {panel(
              <>
                <div className="mb-3">
                  <p className="text-sm font-semibold">Mix stavů</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ze všech rezervací v období.
                  </p>
                </div>
                <StatusMixBar
                  total={data.current.sessions + cancelled + data.current.statuses.pending_review}
                  segments={[
                    {
                      label: "Dokončené",
                      value: data.current.statuses.completed,
                      color: "var(--color-status-ok)",
                    },
                    {
                      label: "Potvrzené",
                      value: data.current.statuses.confirmed,
                      color: "var(--color-coffee)",
                    },
                    {
                      label: "Čeká na zálohu",
                      value: data.current.statuses.deposit_pending,
                      color: "var(--color-status-waiting)",
                    },
                    {
                      label: "Poptávky",
                      value: data.current.statuses.pending_review,
                      color: "var(--color-status-attention)",
                    },
                    {
                      label: "Zrušené/odmítnuté",
                      value: cancelled,
                      color: "var(--color-muted-foreground)",
                    },
                  ]}
                />
              </>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            {panel(
              <>
                <div className="mb-3">
                  <p className="text-sm font-semibold">Výdělek v čase</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Z dokončených sezení, bez záloh.
                  </p>
                </div>
                <LineSeries
                  data={data.series.map((point) => ({
                    label: point.label,
                    value: point.revenue,
                  }))}
                  formatValue={(value) => formatCents(value, currency)}
                  caption="Výdělek v čase"
                />
              </>
            )}
            {panel(
              <>
                <div className="mb-3">
                  <p className="text-sm font-semibold">Top služby</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Podle dokončených sezení a výdělku.
                  </p>
                </div>
                <RankBars
                  items={data.topServices.map((service) => ({
                    label: service.label,
                    value: service.count,
                    secondary: service.revenue,
                  }))}
                  formatValue={(value) => `${value}×`}
                  formatSecondary={(value) => formatCents(value, currency)}
                  emptyText="V tomto období žádná dokončená sezení."
                />
              </>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {panel(
              <>
                <div className="mb-3">
                  <p className="text-sm font-semibold">Nejvytíženější dny</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Kolik termínů padne na který den v týdnu.
                  </p>
                </div>
                <BarSeries
                  data={days}
                  formatValue={(value) => `${value}×`}
                  caption="Rezervace podle dne v týdnu"
                  showAllLabels
                />
              </>
            )}
            {panel(
              <>
                <div className="mb-3">
                  <p className="text-sm font-semibold">Nejvytíženější časy</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Podle začátku sezení.
                  </p>
                </div>
                <BarSeries
                  data={hours}
                  formatValue={(value) => `${value}×`}
                  caption="Rezervace podle hodiny"
                />
              </>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {panel(
              <>
                <div className="mb-3">
                  <p className="text-sm font-semibold">Peníze</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Výdělek a zálohy se nepočítají dvakrát.
                  </p>
                </div>
                <dl className="divide-y divide-border text-sm">
                  {[
                    ["Přijaté zálohy", formatCents(data.current.deposits, currency)],
                    ["Vráceno", formatCents(data.current.refunds, currency)],
                    ["Průměr na rezervaci", formatCents(data.averageTicket, currency)],
                    ["Očekávané (potvrzené)", formatCents(data.expectedRevenue, currency)],
                    ["Nezaplacené zálohy", formatCents(data.unpaidDeposits, currency)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {panel(
              <>
                <div className="mb-3">
                  <p className="text-sm font-semibold">Klienti</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Noví versus vracející se klienti v období.
                  </p>
                </div>
                <dl className="divide-y divide-border text-sm">
                  {[
                    ["Noví klienti", String(data.newClients)],
                    ["Vracející se", String(data.returningClients)],
                    ["Zrušené a odmítnuté", String(cancelled)],
                    [
                      "Míra zrušení",
                      data.current.sessions + cancelled > 0
                        ? `${Math.round(
                            (cancelled /
                              (data.current.sessions + cancelled)) *
                              100
                          )} %`
                        : "—",
                    ],
                    [
                      "Průměr na rezervaci",
                      formatCents(data.averageTicket, currency),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
