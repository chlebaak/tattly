"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  CalendarOffIcon,
  ChevronDownIcon,
  ClockIcon,
  LockIcon,
  LockOpenIcon,
} from "lucide-react";
import { toast } from "sonner";
import { plural } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import {
  MonthCalendar,
  dayKeyOf,
  type MonthDay,
} from "@/components/month-calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCalendarBusy, getDayFreeStarts } from "./actions";
import { blockDay, unblockDay } from "../settings/availability/actions";
import { BookingDetailSheet } from "../booking-detail-sheet";
import { CalendarBookingRow } from "../booking-row";
import type { BookingView } from "../booking-view";

type Props = {
  bookings: BookingView[];
  blockedDays: string[];
  exceptionDays: string[];
  timezone: string;
  services: { id: string; title: string; durationMinutes: number }[];
};

type BusyInterval = { startIso: string; endIso: string };

function busyTimeFormatter(timezone: string) {
  return new Intl.DateTimeFormat("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}

const dayHeadingFormatter = new Intl.DateTimeFormat("cs-CZ", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function CalendarView({
  bookings,
  blockedDays,
  exceptionDays,
  timezone,
  services,
}: Props) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(dayKeyOf(new Date()));
  const [chipBookingId, setChipBookingId] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState<BusyInterval[]>([]);
  const [startsServiceId, setStartsServiceId] = useState(
    services[0]?.id ?? ""
  );
  const [freeStarts, setFreeStarts] = useState<string[] | null>(null);
  const router = useRouter();

  // Obsazenost z Google kalendáře pro zobrazený měsíc (jen orientačně).
  useEffect(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
    let cancelled = false;
    getCalendarBusy({ fromIso: from.toISOString(), toIso: to.toISOString() })
      .then((result) => {
        if (cancelled) return;
        setGoogleBusy(result.ok && result.busy ? result.busy : []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [month]);

  const blockedSet = useMemo(() => new Set(blockedDays), [blockedDays]);
  const exceptionSet = useMemo(() => new Set(exceptionDays), [exceptionDays]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, BookingView[]>();
    for (const booking of bookings) {
      if (!booking.startDayKey) continue;
      const list = map.get(booking.startDayKey) ?? [];
      list.push(booking);
      map.set(booking.startDayKey, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        (a.startTimeIso ?? "").localeCompare(b.startTimeIso ?? "")
      );
    }
    return map;
  }, [bookings]);

  const busyByDay = useMemo(() => {
    const map = new Map<string, BusyInterval[]>();
    for (const interval of googleBusy) {
      const key = dayKeyOf(new Date(interval.startIso));
      const list = map.get(key) ?? [];
      list.push(interval);
      map.set(key, list);
    }
    return map;
  }, [googleBusy]);

  const busyFormatter = useMemo(() => busyTimeFormatter(timezone), [timezone]);

  // Volné starty pro klienta – stejný výpočet jako veřejný formulář.
  useEffect(() => {
    const serviceId = startsServiceId || services[0]?.id;
    if (!serviceId) {
      setFreeStarts([]);
      return;
    }
    let cancelled = false;
    setFreeStarts(null);
    getDayFreeStarts({ dayKey: selectedDay, serviceId })
      .then((result) => {
        if (!cancelled) setFreeStarts(result.ok ? (result.slots ?? []) : []);
      })
      .catch(() => {
        if (!cancelled) setFreeStarts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDay, startsServiceId, services]);

  const dayMap = useMemo(() => {
    const map: Record<string, MonthDay> = {};
    const keys = new Set([
      ...bookingsByDay.keys(),
      ...blockedDays,
      ...exceptionDays,
      ...busyByDay.keys(),
    ]);
    for (const key of keys) {
      const list = bookingsByDay.get(key) ?? [];
      const busy = busyByDay.get(key) ?? [];
      const busyHours = busy.reduce(
        (sum, interval) =>
          sum +
          (new Date(interval.endIso).getTime() -
            new Date(interval.startIso).getTime()) /
            3_600_000,
        0
      );
      map[key] = {
        busyHours,
        chips: list
          .filter((booking) => booking.status !== "cancelled")
          .map((booking) => ({
            id: booking.id,
            timeLabel: booking.startTimeLabel ?? "—",
            label: "",
            variant:
              booking.status === "confirmed"
                ? ("solid" as const)
                : booking.status === "deposit_pending"
                  ? ("outline" as const)
                  : ("pending" as const),
          })),
        state: blockedSet.has(key)
          ? "closed"
          : exceptionSet.has(key)
            ? "exception"
            : "open",
      };
    }
    return map;
  }, [
    bookingsByDay,
    blockedDays,
    exceptionDays,
    blockedSet,
    exceptionSet,
    busyByDay,
  ]);

  const agenda = bookingsByDay.get(selectedDay) ?? [];
  const dayBusy = busyByDay.get(selectedDay) ?? [];
  const isBlocked = blockedSet.has(selectedDay);
  const isException = exceptionSet.has(selectedDay);
  const [year, monthIndex, dayNumber] = [
    ...selectedDay.split("-").map(Number),
  ];
  const selectedDate = new Date(year!, monthIndex! - 1, dayNumber!);
  const isPast =
    selectedDay < dayKeyOf(new Date());

  const pendingCount = agenda.filter(
    (booking) => booking.status === "pending_review"
  ).length;
  const depositCount = agenda.filter(
    (booking) => booking.status === "deposit_pending"
  ).length;
  const confirmedCount = agenda.filter(
    (booking) => booking.status === "confirmed"
  ).length;

  const chipBooking =
    bookings.find((booking) => booking.id === chipBookingId) ?? null;

  async function runBlock() {
    const result = await blockDay({ dayKey: selectedDay });
    if (!result.ok) {
      toast.error(
        result.error === "PAST_DATE"
          ? "Minulé dny nelze blokovat."
          : "Blokování se nezdařilo."
      );
      return;
    }
    toast.success("Den zablokován – nové termíny se v něm nenabízejí.");
    router.refresh();
  }

  async function runUnblock() {
    const result = await unblockDay({ dayKey: selectedDay });
    if (!result.ok) {
      toast.error("Odblokování se nezdařilo.");
      return;
    }
    toast.success("Den odblokován – dostupnost se vrací podle pracovní doby.");
    router.refresh();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div className="space-y-2">
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          days={dayMap}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onChipClick={(dayKey, chipId) => {
            setSelectedDay(dayKey);
            setChipBookingId(chipId);
          }}
          className="w-full lg:w-[600px]"
        />
        <p className="px-2 text-xs text-muted-foreground sm:hidden">
          Číslo v bublině = počet rezervací, tečka = obsazeno v Google
          kalendáři. Klepněte na den pro detail.
        </p>
        <div className="hidden flex-wrap items-center gap-3 px-2 text-xs text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-crema/40 px-1 py-0.5 text-coffee tabular-nums">
              09:00
            </span>
            Potvrzeno
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded border border-border px-1 py-0.5 tabular-nums">
              10:00
            </span>
            Čeká na zálohu
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-status-attention-soft px-1 py-0.5 tabular-nums text-status-attention">
              11:00
            </span>
            Nová poptávka
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-status-waiting" />
            Výjimka
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-muted px-1 py-0.5 text-muted-foreground">
              obsazeno
            </span>
            Google kalendář
          </span>
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium">
              <CalendarIcon className="size-4 text-muted-foreground" />
              <span className="first-letter:uppercase">
                {dayHeadingFormatter.format(selectedDate)}
              </span>
            </p>
            {agenda.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[
                  confirmedCount > 0
                    ? `${confirmedCount} ${plural(confirmedCount, "potvrzená", "potvrzené", "potvrzených")}`
                    : null,
                  depositCount > 0
                    ? `${depositCount} ${plural(depositCount, "čeká", "čekají", "čeká")} na zálohu`
                    : null,
                  pendingCount > 0
                    ? `${pendingCount} ${plural(pendingCount, "nová poptávka", "nové poptávky", "nových poptávek")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isBlocked && <Badge variant="outline">Den je zavřený</Badge>}
            {isException && !isBlocked && (
              <Badge variant="secondary">Výjimka v hodinách</Badge>
            )}
            {isPast ? (
              <span className="text-xs text-muted-foreground">
                Minulý den
              </span>
            ) : isBlocked ? (
              <ConfirmDialog
                trigger={
                  <Button type="button" size="sm" variant="outline">
                    <LockOpenIcon data-icon="inline-start" />
                    Odblokovat
                  </Button>
                }
                title="Odblokovat tento den?"
                description="Den se vrátí do běžné pracovní doby a klienti v něm zase uvidí volné termíny."
                confirmLabel="Odblokovat"
                onConfirm={runUnblock}
              />
            ) : (
              <ConfirmDialog
                trigger={
                  <Button type="button" size="sm" variant="ghost">
                    <LockIcon data-icon="inline-start" />
                    Zablokovat den
                  </Button>
                }
                title="Zablokovat tento den?"
                description={
                  agenda.length > 0
                    ? "Klienti v něm přestanou vidět volné termíny. Existující rezervace zůstávají – když je chcete zrušit, stornujte je v Přehledu."
                    : "Klienti v něm přestanou vidět volné termíny. Kdykoli to můžete vrátit."
                }
                confirmLabel="Zablokovat"
                onConfirm={runBlock}
              />
            )}
          </div>
        </div>

        {agenda.length === 0 && dayBusy.length === 0 ? (
          <EmptyState
            icon={CalendarOffIcon}
            title={isBlocked ? "Den je zavřený" : "Žádné rezervace"}
            description={
              isBlocked
                ? "Klienti v tento den neuvidí žádné volné termíny."
                : "V tento den nemáte nic naplánováno. Klikněte na jiný den v kalendáři."
            }
          />
        ) : (
          <div
            key={selectedDay}
            className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-brand motion-reduce:animate-none"
          >
            {agenda.map((booking) => (
              <CalendarBookingRow key={booking.id} booking={booking} />
            ))}
            {dayBusy.map((interval) => (
              <div
                key={`${interval.startIso}-${interval.endIso}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground"
              >
                <ClockIcon className="size-4 shrink-0" />
                <span className="tabular-nums">
                  {busyFormatter.format(new Date(interval.startIso))}–
                  {busyFormatter.format(new Date(interval.endIso))}
                </span>
                <span className="ml-auto text-xs">
                  Obsazeno (Google kalendář)
                </span>
              </div>
            ))}
            {agenda.length === 0 && dayBusy.length > 0 && (
              <p className="px-1 text-xs text-muted-foreground">
                V tento den nemáte žádnou rezervaci, jen jiný program ve svém
                Google kalendáři.
              </p>
            )}
          </div>
        )}

        {services.length > 0 && (
          <details className="group rounded-[14px] border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block text-sm font-medium">Volné starty pro klienta</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Podle délky služby, rozestupu, předstihu a Google kalendáře.
                </span>
              </span>
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-border px-4 py-3">
              {services.length > 1 && (
                <Select
                  value={startsServiceId || services[0]?.id}
                  onValueChange={setStartsServiceId}
                >
                  <SelectTrigger
                    aria-label="Služba pro volné starty"
                    className="h-9 w-full sm:w-56"
                  >
                    <SelectValue placeholder="Služba" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.title} · {service.durationMinutes} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div
                aria-live="polite"
                className="flex flex-wrap items-center gap-1.5"
              >
                {freeStarts === null ? (
                  <span className="text-xs text-muted-foreground">Počítám…</span>
                ) : freeStarts.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    V tento den není volný termín.
                  </span>
                ) : (
                  freeStarts.map((time) => (
                    <span
                      key={time}
                      className="rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums"
                    >
                      {time}
                    </span>
                  ))
                )}
              </div>
            </div>
          </details>
        )}
      </div>

      {chipBooking && (
        <BookingDetailSheet
          booking={chipBooking}
          open
          onOpenChange={(open) => {
            if (!open) setChipBookingId(null);
          }}
        />
      )}
    </div>
  );
}
