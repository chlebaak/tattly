"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  CalendarOffIcon,
  LockIcon,
  LockOpenIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import {
  MonthCalendar,
  dayKeyOf,
  type CalendarChip,
} from "@/components/month-calendar";
import { blockDay, unblockDay } from "../settings/availability/actions";
import { BookingRow } from "../booking-row";
import type { BookingView } from "../booking-view";

type Props = {
  bookings: BookingView[];
  chipsByDay: Record<string, CalendarChip[]>;
  blockedDays: string[];
};

export function CalendarView({ bookings, chipsByDay, blockedDays }: Props) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(dayKeyOf(new Date()));
  const [blocking, setBlocking] = useState(false);
  const router = useRouter();

  const isBlocked = blockedDays.includes(selectedDay);
  const agenda = useMemo(
    () =>
      bookings
        .filter((b) => b.startDayKey === selectedDay)
        .sort((a, b) =>
          (a.startTimeIso ?? "").localeCompare(b.startTimeIso ?? "")
        ),
    [bookings, selectedDay]
  );

  async function toggleBlock() {
    if (!isBlocked) {
      const message =
        agenda.length > 0
          ? "Zablokovat den? Existující rezervace zůstávají – pokud je chcete zrušit, stornujte je v Přehledu."
          : "Zablokovat tento den? Klienti v něm nebudou moci rezervovat.";
      if (!window.confirm(message)) return;
      setBlocking(true);
      const result = await blockDay({ dayKey: selectedDay });
      setBlocking(false);
      if (!result.ok) {
        toast.error(
          result.error === "PAST_DATE"
            ? "Minulé dny nelze blokovat."
            : "Blokování se nezdařilo."
        );
        return;
      }
      toast.success("Den zablokován – nové sloty se negenerují.");
      router.refresh();
      return;
    }
    setBlocking(true);
    const result = await unblockDay({ dayKey: selectedDay });
    setBlocking(false);
    if (!result.ok) {
      toast.error("Odblokování se nezdařilo.");
      return;
    }
    toast.success("Den odblokován – dostupnost se vrací podle pracovní doby.");
    router.refresh();
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[auto_1fr]">
      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        days={Object.fromEntries(
          Object.entries(chipsByDay).map(([key, chips]) => [
            key,
            { chips, state: undefined },
          ])
        )}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        className="w-full sm:w-fit"
      />
      <p className="px-1 text-xs text-muted-foreground sm:hidden">
        Číslo v bublině = počet rezervací v daný den.
      </p>
      <p className="hidden items-center gap-4 px-2 text-xs text-muted-foreground sm:flex">
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-foreground/10 px-1 py-0.5 text-xs">
            09:00
          </span>
          Potvrzené
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded border border-foreground/40 px-1 py-0.5 text-xs">
            10:00
          </span>
          Čeká na zálohu
        </span>
      </p>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-medium">
            <CalendarIcon className="size-4 text-muted-foreground" />
            {new Intl.DateTimeFormat("cs-CZ", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(`${selectedDay}T12:00:00`))}
          </p>
          <div className="flex items-center gap-2">
            {isBlocked && <Badge variant="outline">Den zablokován</Badge>}
            <Button
              type="button"
              size="sm"
              variant={isBlocked ? "outline" : "ghost"}
              disabled={blocking}
              onClick={toggleBlock}
            >
              {isBlocked ? (
                <LockOpenIcon data-icon="inline-start" />
              ) : (
                <LockIcon data-icon="inline-start" />
              )}
              {isBlocked ? "Odblokovat" : "Zablokovat den"}
            </Button>
          </div>
        </div>
        {agenda.length === 0 ? (
          <EmptyState
            icon={CalendarOffIcon}
            title="Žádné rezervace"
            description="V tento den nic není. Klikněte na jiný den v kalendáři."
          />
        ) : (
          <div
            key={selectedDay}
            className="grid gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-brand motion-reduce:animate-none"
          >
            {agenda.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
