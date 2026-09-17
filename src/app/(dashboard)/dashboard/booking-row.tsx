"use client";

import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { StatusBadge } from "@/components/status-badge";
import { formatCents } from "@/lib/utils";
import { ApproveDialog } from "./approve-dialog";
import { BookingDetailSheet } from "./booking-detail-sheet";
import { QrConfirmButton } from "./qr-confirm-button";
import type { BookingView } from "./booking-view";

export function BookingRow({
  booking,
  quickActions = false,
}: {
  booking: BookingView;
  quickActions?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const priceLabel = booking.priceMinor
    ? formatCents(booking.priceMinor)
    : booking.depositAmount
      ? `záloha ${formatCents(booking.depositAmount)}`
      : null;

  const rowTone =
    booking.status === "pending_review"
      ? "bg-status-attention-soft/50 hover:bg-status-attention-soft/80"
      : booking.status === "deposit_pending"
        ? "bg-status-waiting-soft/50 hover:bg-status-waiting-soft/80"
        : "bg-card hover:bg-muted/40";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-3 ring-1 ring-foreground/8 transition-colors",
        rowTone
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {booking.clientName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {[booking.serviceTitle, booking.startLabel ?? "termín k návrhu"]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {priceLabel && (
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
              {priceLabel}
            </span>
          )}
          <StatusBadge status={booking.status} />
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </span>
      </button>
      {quickActions && booking.status === "pending_review" && (
        <div className="shrink-0">
          <ApproveDialog booking={booking} />
        </div>
      )}
      {quickActions &&
        booking.status === "deposit_pending" &&
        booking.qrAvailable && (
          <div className="shrink-0">
            <QrConfirmButton bookingId={booking.id} compact />
          </div>
        )}
      <BookingDetailSheet booking={booking} open={open} onOpenChange={setOpen} />
    </div>
  );
}
