"use client";

import { useState } from "react";
import { CalendarOffIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { StatusBadge } from "@/components/status-badge";
import { useBookingSheet } from "./booking-sheet";
import type { BookingView } from "./booking-view";

function AgendaRow({
  booking,
  nextId,
}: {
  booking: BookingView;
  nextId: string | null;
}) {
  const { openSheet, sheet } = useBookingSheet(booking);

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={openSheet}
        className="group grid w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left transition-colors duration-150 hover:bg-accent/35 active:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="text-sm font-semibold tabular-nums">
          {booking.startTimeLabel ?? "—"}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {booking.clientName}
            </span>
            {booking.id === nextId ? (
              <span className="shrink-0 text-[11px] font-medium text-coffee">
                Další
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {[booking.serviceTitle, booking.durationMinutes ? `${booking.durationMinutes} min` : null]
              .filter(Boolean)
              .join(" · ") || "Bez služby"}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <StatusBadge status={booking.status} size="sm" />
          <ChevronRightIcon className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </button>
      {sheet}
    </li>
  );
}

export function DayAgenda({
  today,
  tomorrow,
  nextId,
}: {
  today: BookingView[];
  tomorrow: BookingView[];
  nextId: string | null;
}) {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const items = day === "today" ? today : tomorrow;

  return (
    <section className="min-w-0" aria-labelledby="agenda-heading">
      <div className="flex items-end justify-between gap-4">
        <h2 id="agenda-heading" className="text-sm font-semibold">
          Dnešní rozvrh
        </h2>
        <div className="flex items-center gap-4 text-sm">
          {(["today", "tomorrow"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDay(value)}
              aria-pressed={day === value}
              className={cn(
                "border-b-2 pb-0.5 text-xs font-medium transition-[color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                day === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {value === "today" ? "Dnes" : "Zítra"}
            </button>
          ))}
        </div>
      </div>

      <div key={day} className="animate-enter">
        {items.length === 0 ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-border bg-card px-4 py-3.5">
            <CalendarOffIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm">
              <span className="font-medium">
                {day === "today"
                  ? "Dnes žádné termíny."
                  : "Zítra žádné termíny."}
              </span>{" "}
              <span className="text-muted-foreground">
                {day === "today" && tomorrow.length > 0
                  ? "Zítra máte naplánovaný termín."
                  : "Nové potvrzené termíny se objeví tady."}
              </span>
            </p>
          </div>
        ) : (
          <ul className="mt-2">
            {items.map((booking) => (
              <AgendaRow key={booking.id} booking={booking} nextId={nextId} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
