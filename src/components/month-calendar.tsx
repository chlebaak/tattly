"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export type CalendarChip = {
  id: string;
  timeLabel: string;
  label: string;
  variant?: "solid" | "outline";
};

export type MonthDay = {
  chips: CalendarChip[];
  state?: "open" | "exception" | "closed";
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function pluralChips(n: number): string {
  if (n === 1) return "1 rezervace";
  if (n >= 2 && n <= 4) return `${n} rezervace`;
  return `${n} rezervací`;
}

type Props = {
  month: Date;
  onMonthChange: (month: Date) => void;
  days: Record<string, MonthDay>;
  selectedDay: string;
  onSelectDay: (dayKey: string) => void;
  size?: "sm" | "lg";
  className?: string;
};

export function MonthCalendar({
  month,
  onMonthChange,
  days,
  selectedDay,
  onSelectDay,
  size = "sm",
  className,
}: Props) {
  const lg = size === "lg";
  const today = dayKeyOf(new Date());
  const maxChips = lg ? 3 : 2;
  const [direction, setDirection] = useState<1 | -1>(1);

  function changeMonth(next: Date) {
    setDirection(next > month ? 1 : -1);
    onMonthChange(next);
  }

  const weeks = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const rows: (Date | null)[][] = [];
    let week: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(new Date(year, m, d));
      if (week.length === 7) {
        rows.push(week);
        week = [];
      }
    }
    if (week.length) {
      while (week.length < 7) week.push(null);
      rows.push(week);
    }
    return rows;
  }, [month]);

  const monthLabel = new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric",
  }).format(month);

  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-3 shadow-panel ring-1 ring-foreground/8 sm:p-4",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between sm:mb-3">
        <p
          className={cn(
            "font-display",
            lg ? "text-xl" : "text-base"
          )}
        >
          {monthLabel}
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Předchozí měsíc"
            onClick={() =>
              changeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Další měsíc"
            onClick={() =>
              changeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground/80">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div
        key={`${month.getFullYear()}-${month.getMonth()}`}
        className={cn(
          "mt-1 grid grid-cols-7 gap-1 animate-in fade-in-0 duration-300 ease-brand motion-reduce:animate-none",
          direction === 1 ? "slide-in-from-right-2" : "slide-in-from-left-2"
        )}
      >
        {weeks.flat().map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const key = dayKeyOf(date);
          const day = days[key];
          const isToday = key === today;
          const selected = key === selectedDay;
          const hasChips = (day?.chips.length ?? 0) > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              aria-pressed={selected}
              aria-label={`${new Intl.DateTimeFormat("cs-CZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(date)}${
                day && day.chips.length > 0
                  ? ` — ${pluralChips(day.chips.length)}`
                  : ""
              }`}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-lg p-1.5 text-center text-xs transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                lg ? "min-h-16 sm:min-h-28" : "min-h-16 sm:min-h-20",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                !selected &&
                  (date.getDay() === 0 || date.getDay() === 6) &&
                  "bg-muted/40",
                !selected && day?.state === "closed" && "opacity-50"
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums sm:text-base",
                  lg && "sm:text-lg",
                  !selected && day?.state === "closed" && "line-through"
                )}
              >
                {date.getDate()}
              </span>
              {hasChips ? (
                <>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs font-bold leading-none tabular-nums sm:hidden",
                      selected
                        ? "bg-primary-foreground/20"
                        : "bg-foreground/10 text-foreground"
                    )}
                  >
                    {day!.chips.length}×
                  </span>
                  <span className="hidden w-full flex-col items-stretch gap-0.5 sm:flex">
                    {day!.chips.slice(0, maxChips).map((chip) => (
                      <span
                        key={chip.id}
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-xs leading-tight tabular-nums",
                          chip.variant === "outline"
                            ? selected
                              ? "border border-primary-foreground/60"
                              : "border border-foreground/40"
                            : selected
                              ? "bg-primary-foreground/90 text-primary"
                              : "bg-foreground/10"
                        )}
                      >
                        {chip.timeLabel}
                        {chip.label ? ` ${chip.label}` : ""}
                      </span>
                    ))}
                    {day!.chips.length > maxChips && (
                      <span
                        className={cn(
                          "text-xs",
                          selected ? "opacity-80" : "text-muted-foreground"
                        )}
                      >
                        +{day!.chips.length - maxChips}
                      </span>
                    )}
                  </span>
                </>
              ) : day?.state === "exception" ? (
                <span
                  className={cn(
                    "mt-0.5 size-1.5 rounded-full",
                    selected ? "bg-primary-foreground" : "bg-foreground/60"
                  )}
                />
              ) : null}
              {!selected && isToday && (
                <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground/70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
