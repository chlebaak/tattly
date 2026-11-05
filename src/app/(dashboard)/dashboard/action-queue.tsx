"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils";
import type { DashboardQueueItem } from "@/lib/dashboard";
import { BookingPrimaryAction } from "./booking-actions";
import { useBookingSheet } from "./booking-sheet";

const KIND_LABEL: Record<DashboardQueueItem["kind"], string> = {
  request: "Nová poptávka",
  claim: "Klient hlásí platbu",
  message: "Zpráva od klienta",
};

const REQUEST_KIND_LABEL = {
  reschedule: "Žádost o přesun",
  cancel: "Klient nemůže dorazit",
  question: "Dotaz klienta",
} as const;

function contextFor(item: DashboardQueueItem): string {
  if (item.kind === "message" && item.booking.openRequest) {
    const label = REQUEST_KIND_LABEL[item.booking.openRequest.kind];
    return item.booking.openRequest.message
      ? `${label} · „${item.booking.openRequest.message}“`
      : label;
  }
  if (item.kind === "claim" && item.booking.depositAmount) {
    return `Záloha ${formatCents(item.booking.depositAmount)}`;
  }
  return (
    [item.booking.serviceTitle, item.booking.startLabel]
      .filter(Boolean)
      .join(" · ") || "Bez služby"
  );
}

function QueueRow({ item }: { item: DashboardQueueItem }) {
  const { openSheet, sheet } = useBookingSheet(item.booking);
  const dot =
    item.kind === "request"
      ? "bg-status-attention"
      : item.kind === "claim"
        ? "bg-status-waiting"
        : "bg-muted-foreground/50";

  return (
    <li className="group border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-accent/35 active:bg-accent/50">
      <div className="flex items-start gap-3 py-3.5">
        <button
          type="button"
          onClick={openSheet}
          className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
            {KIND_LABEL[item.kind]}
          </span>
          <span className="mt-1 block truncate text-sm font-semibold">
            {item.booking.clientName}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {contextFor(item)}
          </span>
        </button>
        <div className="shrink-0 pt-1">
          {item.kind === "message" ? (
            <Button type="button" size="sm" variant="outline" onClick={openSheet}>
              Otevřít
            </Button>
          ) : (
            <BookingPrimaryAction
              booking={item.booking}
              size="default"
              label={item.kind === "claim" ? "Potvrdit" : undefined}
            />
          )}
        </div>
      </div>
      {sheet}
    </li>
  );
}

export function ActionQueue({ items }: { items: DashboardQueueItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 3);

  return (
    <section className="flex h-full flex-col" aria-labelledby="queue-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="queue-heading" className="text-sm font-semibold">
          Na vás čeká
        </h2>
        {items.length > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {items.length}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-border bg-card px-4 py-3.5">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-status-ok" />
          <p className="text-sm">
            <span className="font-medium">Vše vyřízeno.</span>{" "}
            <span className="text-muted-foreground">
              Nové poptávky a zprávy se objeví tady.
            </span>
          </p>
        </div>
      ) : (
        <ul className="mt-2">
          {shown.map((item) => (
            <QueueRow key={item.key} item={item} />
          ))}
        </ul>
      )}

      {items.length > 3 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Zobrazit méně" : `Zobrazit vše (${items.length})`}
          <ChevronDownIcon
            data-icon="inline-end"
            className={expanded ? "rotate-180 transition-transform" : "transition-transform"}
          />
        </Button>
      ) : null}
    </section>
  );
}
