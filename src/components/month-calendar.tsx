"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";

export type CalendarChip = {
  id: string;
  timeLabel: string;
  label: string;
  variant?: "solid" | "outline" | "pending";
};

export type MonthDay = {
  chips: CalendarChip[];
  state?: "open" | "exception" | "closed";
  /** Obsazeno v Google kalendáři – jen orientační blok, neklikatelný. */
  busyHours?: number;
};

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

const MONTHS = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDayKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year!, (month ?? 1) - 1, day ?? 1);
}

function pluralChips(n: number): string {
  if (n === 1) return "1 rezervace";
  if (n >= 2 && n <= 4) return `${n} rezervace`;
  return `${n} rezervací`;
}

const busyFormatter = new Intl.NumberFormat("cs-CZ", {
  maximumFractionDigits: 1,
});

const dayFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("cs-CZ", {
  month: "long",
  year: "numeric",
});

type Props = {
  month: Date;
  onMonthChange: (month: Date) => void;
  days: Record<string, MonthDay>;
  selectedDay: string;
  onSelectDay: (dayKey: string) => void;
  onChipClick?: (dayKey: string, chipId: string) => void;
  size?: "sm" | "lg";
  className?: string;
};

export function MonthCalendar({
  month,
  onMonthChange,
  days,
  selectedDay,
  onSelectDay,
  onChipClick,
  size = "sm",
  className,
}: Props) {
  const lg = size === "lg";
  const today = dayKeyOf(new Date());
  const maxChips = lg ? 3 : 2;
  const [direction, setDirection] = useState<1 | -1>(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(month.getFullYear());

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

  function moveFocus(event: KeyboardEvent<HTMLDivElement>, dayKey: string) {
    const delta =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -7
            : event.key === "ArrowDown"
              ? 7
              : 0;
    if (!delta) return;
    event.preventDefault();
    const current = parseDayKey(dayKey);
    const next = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + delta
    );
    const nextKey = dayKeyOf(next);
    if (
      next.getMonth() !== month.getMonth() ||
      next.getFullYear() !== month.getFullYear()
    ) {
      onMonthChange(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    onSelectDay(nextKey);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-daykey="${nextKey}"]`)
        ?.focus();
    });
  }

  return (
    <div
      className={cn(
        "rounded-[18px] border border-border bg-card p-3 sm:p-4",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
        <Popover
          open={pickerOpen}
          onOpenChange={(next) => {
            setPickerOpen(next);
            if (next) setPickerYear(month.getFullYear());
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-1.5 py-1 font-medium tracking-tight transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                lg ? "text-lg" : "text-sm"
              )}
            >
              {monthFormatter.format(month)}
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Předchozí rok"
                onClick={() => setPickerYear((year) => year - 1)}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="text-sm font-medium tabular-nums">
                {pickerYear}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Další rok"
                onClick={() => setPickerYear((year) => year + 1)}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {MONTHS.map((label, index) => {
                const active =
                  index === month.getMonth() &&
                  pickerYear === month.getFullYear();
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      changeMonth(new Date(pickerYear, index, 1));
                      setPickerOpen(false);
                    }}
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary font-medium text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                const now = new Date();
                changeMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                onSelectDay(dayKeyOf(now));
                setPickerOpen(false);
              }}
            >
              Dnes
            </Button>
          </PopoverContent>
        </Popover>

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
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div
        key={`${month.getFullYear()}-${month.getMonth()}`}
        onKeyDown={(event) => {
          const target = event.target as HTMLElement;
          const key = target.dataset?.daykey;
          if (key) moveFocus(event, key);
        }}
        className={cn(
          "mt-1 grid grid-cols-7 gap-1 animate-in fade-in-0 duration-200 ease-brand motion-reduce:animate-none",
          direction === 1 ? "slide-in-from-right-1" : "slide-in-from-left-1"
        )}
      >
        {weeks.flat().map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const key = dayKeyOf(date);
          const day = days[key];
          const isToday = key === today;
          const selected = key === selectedDay;
          const chips = day?.chips ?? [];
          const closed = day?.state === "closed";
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <div
              key={key}
              className={cn(
                "relative rounded-lg",
                lg ? "min-h-16 sm:min-h-28" : "min-h-16 sm:min-h-20",
                !selected && weekend && "bg-muted/30",
                !selected && closed && "bg-muted/50"
              )}
            >
              <button
                type="button"
                data-daykey={key}
                onClick={() => onSelectDay(key)}
                aria-pressed={selected}
                aria-label={`${dayFormatter.format(date)}${
                  chips.length > 0 ? ` — ${pluralChips(chips.length)}` : ""
                }${closed ? " — zavřeno" : ""}${
                  (day?.busyHours ?? 0) > 0
                    ? ` — obsazeno (Google): ${busyFormatter.format(day!.busyHours!)} h`
                    : ""
                }`}
                className={cn(
                  "absolute inset-0 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  selected ? "bg-primary" : "hover:bg-muted",
                  !selected && closed && "opacity-60"
                )}
              />
              <div className="pointer-events-none relative flex h-full flex-col items-center gap-1 p-1.5">
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums sm:text-base",
                    lg && "sm:text-lg",
                    selected ? "text-primary-foreground" : "text-foreground",
                    !selected && closed && "line-through"
                  )}
                >
                  {date.getDate()}
                </span>

                {chips.length > 0 ? (
                  <>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-xs leading-none font-bold tabular-nums sm:hidden",
                        selected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-crema/35 text-coffee"
                      )}
                    >
                      {chips.length}×
                    </span>
                    <span className="hidden w-full flex-col items-stretch gap-0.5 sm:flex">
                      {chips.slice(0, maxChips).map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (onChipClick) {
                              onChipClick(key, chip.id);
                            } else {
                              onSelectDay(key);
                            }
                          }}
                          className={cn(
                            "pointer-events-auto truncate rounded px-1 py-0.5 text-left text-xs leading-tight tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selected
                              ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                              : chip.variant === "outline"
                                ? "border border-status-waiting/40 text-status-waiting hover:bg-status-waiting-soft"
                                : chip.variant === "pending"
                                  ? "bg-status-attention-soft text-status-attention hover:bg-status-attention-soft/70"
                                  : "bg-crema/35 text-coffee hover:bg-crema/50"
                          )}
                        >
                          {chip.timeLabel}
                          {chip.label ? ` ${chip.label}` : ""}
                        </button>
                      ))}
                      {chips.length > maxChips && (
                        <span
                          className={cn(
                            "text-xs",
                            selected
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          +{chips.length - maxChips}
                        </span>
                      )}
                    </span>
                  </>
                ) : day?.state === "exception" ? (
                  <span
                    className={cn(
                      "mt-0.5 size-1.5 rounded-full",
                      selected ? "bg-primary-foreground" : "bg-status-waiting"
                    )}
                  />
                ) : closed ? (
                  <span
                    className={cn(
                      "text-xs",
                      selected
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    zavřeno
                  </span>
                ) : null}

                {(day?.busyHours ?? 0) > 0 && (
                  <>
                    <span
                      className={cn(
                        "mt-0.5 hidden rounded px-1 py-0.5 text-[10px] leading-none sm:block",
                        selected
                          ? "bg-primary-foreground/15 text-primary-foreground/90"
                          : "bg-muted text-muted-foreground"
                      )}
                      title={`Obsazeno ve vašem Google kalendáři (${busyFormatter.format(day!.busyHours!)} h)`}
                    >
                      obsazeno
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 size-1.5 rounded-full sm:hidden",
                        selected ? "bg-primary-foreground/40" : "bg-muted-foreground/40"
                      )}
                    />
                  </>
                )}

                {!selected && isToday && (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-coffee" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
