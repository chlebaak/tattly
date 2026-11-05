"use client";

import { ChevronRightIcon } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { BookingActionsMenu } from "./booking-actions";
import { useBookingSheet } from "./booking-sheet";
import type { BookingView } from "./booking-view";

/** Kompaktní řádek v kalendáři – detail se otevírá v sheetu. */
export function CalendarBookingRow({ booking }: { booking: BookingView }) {
  const { openSheet, sheet } = useBookingSheet(booking);

  return (
    <div className="group flex min-w-0 items-center gap-3 px-3 py-3 transition-colors duration-150 hover:bg-accent/35 active:bg-accent/50">
      <span className="w-11 shrink-0 text-sm font-semibold tabular-nums">
        {booking.startTimeLabel ?? "—"}
      </span>
      <button
        type="button"
        onClick={openSheet}
        className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="block truncate text-sm font-medium">
          {booking.clientName}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {booking.serviceTitle ?? "Bez služby"}
        </span>
      </button>
      <StatusBadge status={booking.status} size="sm" />
      <BookingActionsMenu booking={booking} />
      <ChevronRightIcon className="hidden size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 sm:block" />
      {sheet}
    </div>
  );
}
