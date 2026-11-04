"use client";

import Link from "next/link";
import { CalendarDaysIcon, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCents } from "@/lib/utils";
import { BookingActionsMenu } from "./booking-actions";
import { useBookingSheet } from "./booking-sheet";
import type { BookingView } from "./booking-view";

export type NextAppointmentEmpty = {
  title: string;
  description: string;
  href: string;
  action: string;
};

export function NextAppointment({
  booking,
  dayLabel,
  endTimeLabel,
  empty,
}: {
  booking: BookingView | null;
  dayLabel: string | null;
  endTimeLabel: string | null;
  empty: NextAppointmentEmpty;
}) {
  const { openSheet, sheet } = useBookingSheet(booking);

  if (!booking) {
    return (
      <div className="flex h-full flex-col justify-between rounded-[20px] border border-border bg-card p-6 sm:p-7">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Nejbližší termín
          </p>
          <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">
            {empty.title}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {empty.description}
          </p>
        </div>
        <Button asChild variant="outline" className="mt-6 w-fit">
          <Link href={empty.href}>
            <CalendarDaysIcon data-icon="inline-start" />
            {empty.action}
          </Link>
        </Button>
      </div>
    );
  }

  const deposit =
    booking.depositAmount && booking.depositAmount > 0
      ? `Záloha ${formatCents(booking.depositAmount)}${
          booking.clientPaidAtIso ? " · uhrazeno" : ""
        }`
      : null;
  const meta = [
    deposit,
    booking.googleLinked ? "Google kalendář" : null,
  ].filter(Boolean);

  return (
    <div className="flex h-full flex-col rounded-[20px] border border-border bg-card p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          Nejbližší termín
        </p>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {dayLabel ? (
          <span className="rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground">
            {dayLabel}
          </span>
        ) : null}
        <span className="text-5xl leading-none font-semibold tracking-[-0.05em] tabular-nums sm:text-6xl">
          {booking.startTimeLabel ?? "—"}
        </span>
        {endTimeLabel ? (
          <span className="text-lg text-muted-foreground tabular-nums">
            – {endTimeLabel}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
        {booking.clientName}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {[booking.serviceTitle, booking.durationMinutes ? `${booking.durationMinutes} min` : null]
          .filter(Boolean)
          .join(" · ") || "Bez služby"}
      </p>

      {meta.length > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {meta.map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
              {item}
            </span>
          ))}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
        <Button type="button" onClick={openSheet}>
          Detail termínu
        </Button>
        <Button type="button" variant="outline" onClick={openSheet}>
          Napsat
        </Button>
        <div className="ml-auto">
          <BookingActionsMenu booking={booking} />
        </div>
      </div>
      {sheet}
    </div>
  );
}

export function ShareProfileButton({ url }: { url: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard
          .writeText(url)
          .then(() => toast.success("Odkaz na profil zkopírován"))
          .catch(() => toast.error("Kopírování se nezdařilo"));
      }}
    >
      <LinkIcon data-icon="inline-start" />
      Sdílet profil
    </Button>
  );
}
