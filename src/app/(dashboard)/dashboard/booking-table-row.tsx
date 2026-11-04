"use client";

import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/status-badge";
import { formatCents } from "@/lib/utils";
import { BookingActionsMenu, BookingPrimaryAction } from "./booking-actions";
import { useBookingSheet } from "./booking-sheet";
import type { BookingView } from "./booking-view";

export function BookingTableRow({
  booking,
  selectable = false,
  selected = false,
  onSelectedChange,
}: {
  booking: BookingView;
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
}) {
  const { openSheet, sheet } = useBookingSheet(booking);
  const price = booking.priceMinor
    ? formatCents(booking.priceMinor)
    : booking.depositAmount
      ? `záloha ${formatCents(booking.depositAmount)}`
      : null;
  const meta = [booking.serviceTitle, price].filter(Boolean).join(" · ");

  return (
    <li
      className={cn(
        "border-b border-border last:border-b-0",
        selected && "bg-accent/40"
      )}
    >
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
        {selectable ? (
          <Checkbox
            checked={selected}
            onCheckedChange={(value) => onSelectedChange?.(value === true)}
            aria-label={`Vybrat rezervaci ${booking.clientName}`}
          />
        ) : (
          <span aria-hidden className="w-4 shrink-0" />
        )}

        <button
          type="button"
          onClick={openSheet}
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="flex items-start justify-between gap-3 sm:hidden">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {booking.clientName}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {booking.startLabel ?? "bez termínu"}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {meta || "bez služby"}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 pt-0.5">
              <StatusBadge status={booking.status} size="sm" />
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </span>
          </span>

          <span className="hidden items-center gap-4 sm:grid sm:grid-cols-[minmax(0,1.3fr)_170px_minmax(0,1fr)_120px]">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {booking.clientName}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {booking.clientEmail}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm tabular-nums">
                {booking.startLabel ?? "—"}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                {booking.durationMinutes
                  ? `${booking.durationMinutes} min`
                  : "bez termínu"}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm">
                {booking.serviceTitle ?? "Bez služby"}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
                {price ?? "—"}
              </span>
            </span>
            <StatusBadge status={booking.status} size="sm" />
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <BookingPrimaryAction
            booking={booking}
            size="default"
            label={booking.status === "deposit_pending" ? "Potvrdit" : "Schválit"}
          />
          <BookingActionsMenu booking={booking} />
        </div>
      </div>
      {sheet}
    </li>
  );
}
