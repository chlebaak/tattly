"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/date-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getSuggestedSlots, rescheduleBooking } from "./actions";
import type { BookingView } from "./booking-view";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: "Zkontrolujte zadané údaje.",
  NOT_FOUND: "Rezervace nenalezena.",
  INVALID_STATE: "Rezervace už je v jiném stavu.",
  PAST: "Nový termín musí být v budoucnosti.",
  SLOT_TAKEN: "Nový termín koliduje s jinou rezervací.",
  UNKNOWN: "Něco se pokazilo. Zkuste to znovu.",
};

const DURATIONS = [30, 45, 60, 90, 120, 180, 240, 300, 360, 480];

export function RescheduleDialog({
  booking,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  booking: BookingView;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const controlled = openProp !== undefined;
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlled ? openProp : innerOpen;
  const [pending, setPending] = useState(false);
  const [date, setDate] = useState(
    booking.proposedStartValue?.split("T")[0] ?? ""
  );
  const [time, setTime] = useState(
    booking.proposedStartValue?.split("T")[1]?.slice(0, 5) ?? ""
  );
  const [duration, setDuration] = useState(
    String(booking.durationMinutes ?? booking.serviceDurationMinutes ?? 60)
  );
  const [slots, setSlots] = useState<{ iso: string; label: string }[] | null>(
    null
  );
  const [slotsLoading, setSlotsLoading] = useState(false);
  const router = useRouter();

  function setOpen(next: boolean) {
    if (!controlled) setInnerOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!open) return;
    setDate(booking.proposedStartValue?.split("T")[0] ?? "");
    setTime(booking.proposedStartValue?.split("T")[1]?.slice(0, 5) ?? "");
    setDuration(
      String(booking.durationMinutes ?? booking.serviceDurationMinutes ?? 60)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !date) return;
    let cancelled = false;
    setSlotsLoading(true);
    getSuggestedSlots({ bookingId: booking.id, dayKey: date })
      .then((result) => {
        if (!cancelled) setSlots(result.ok ? result.slots : []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, date, booking.id]);

  async function onSubmit() {
    const startIso =
      date && time ? new Date(`${date}T${time}`).toISOString() : "";
    const durationMinutes = Number(duration);
    if (!startIso) {
      toast.error("Vyberte nové datum a čas.");
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15) {
      toast.error("Délka musí být minimálně 15 minut.");
      return;
    }
    setPending(true);
    const result = await rescheduleBooking({
      bookingId: booking.id,
      startIso,
      durationMinutes,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(
        ERROR_MESSAGES[result.error ?? "UNKNOWN"] ?? ERROR_MESSAGES.UNKNOWN
      );
      return;
    }
    toast.success("Termín upraven – klient byl informován e-mailem.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upravit termín</DialogTitle>
          <DialogDescription>
            {booking.clientName}
            {booking.serviceTitle ? ` · ${booking.serviceTitle}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`rs-date-${booking.id}`}>Nové datum</Label>
            <DateField
              id={`rs-date-${booking.id}`}
              value={date}
              onChange={setDate}
              minToday
            />
          </div>

          <div className="space-y-2">
            <Label>Volné termíny</Label>
            {slotsLoading ? (
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <Skeleton key={index} className="h-8 w-16 rounded-lg" />
                ))}
              </div>
            ) : slots && slots.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {slots.map((slot) => {
                  const active = slot.label === time;
                  return (
                    <button
                      key={slot.iso}
                      type="button"
                      onClick={() => setTime(slot.label)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pro tento den nejsou podle pracovní doby volné termíny – čas
                zadejte ručně.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`rs-time-${booking.id}`}>Čas</Label>
              <Input
                id={`rs-time-${booking.id}`}
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`rs-duration-${booking.id}`}>Délka (min)</Label>
              <Input
                id={`rs-duration-${booking.id}`}
                type="number"
                min={15}
                step={15}
                list={`rs-durations-${booking.id}`}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
              <datalist id={`rs-durations-${booking.id}`}>
                {DURATIONS.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {booking.status === "confirmed"
              ? "Změna se zapíše do Google kalendáře a klient dostane e-mail."
              : "Rezervace zatím čeká na zálohu – změna se pošle klientovi e-mailem."}
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Zrušit
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={pending || !date || !time}
          >
            {pending ? "Ukládám…" : "Přesunout termín"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
