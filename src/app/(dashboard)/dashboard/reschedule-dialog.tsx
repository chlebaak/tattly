"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { rescheduleBooking } from "./actions";
import type { BookingView } from "./booking-view";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: "Zkontrolujte zadané údaje.",
  NOT_FOUND: "Rezervace nenalezena.",
  INVALID_STATE: "Rezervace už je v jiném stavu.",
  PAST: "Nový termín musí být v budoucnosti.",
  SLOT_TAKEN: "Nový termín koliduje s jinou rezervací.",
  UNKNOWN: "Něco se pokazilo. Zkuste to znovu.",
};

export function RescheduleDialog({ booking }: { booking: BookingView }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [date, setDate] = useState(
    booking.proposedStartValue?.split("T")[0] ?? ""
  );
  const [time, setTime] = useState(
    booking.proposedStartValue?.split("T")[1]?.slice(0, 5) ?? ""
  );
  const [duration, setDuration] = useState(
    String(booking.durationMinutes ?? 60)
  );
  const router = useRouter();

  async function onSubmit() {
    const startIso = date && time ? new Date(`${date}T${time}`).toISOString() : "";
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDate(booking.proposedStartValue?.split("T")[0] ?? "");
          setTime(booking.proposedStartValue?.split("T")[1]?.slice(0, 5) ?? "");
          setDuration(String(booking.durationMinutes ?? 60));
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Upravit termín
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
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
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`rs-time-${booking.id}`}>Čas</Label>
              <Input
                id={`rs-time-${booking.id}`}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`rs-duration-${booking.id}`}>Délka (min)</Label>
              <Input
                id={`rs-duration-${booking.id}`}
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {booking.status === "confirmed"
              ? "Google kalendář i klient se automaticky aktualizují."
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
