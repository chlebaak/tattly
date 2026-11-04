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
import { approveBookingAction, getSuggestedSlots } from "./actions";
import type { BookingView } from "./booking-view";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: "Zkontrolujte zadané údaje.",
  NOT_FOUND: "Poptávka nenalezena.",
  INVALID_STATE: "Poptávka už není ke schválení.",
  SLOT_TAKEN: "Termín je už obsazený jinou rezervací – vyberte jiný.",
  UNKNOWN: "Něco se pokazilo. Zkuste to znovu.",
};

function datePart(booking: BookingView): string {
  return booking.proposedStartValue?.split("T")[0] ?? "";
}

function timePart(booking: BookingView): string {
  return booking.proposedStartValue?.split("T")[1]?.slice(0, 5) ?? "";
}

export function ApproveDialog({
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
  const [startDate, setStartDate] = useState(datePart(booking));
  const [startTime, setStartTime] = useState(timePart(booking));
  const [depositCzk, setDepositCzk] = useState("");
  const [priceCzk, setPriceCzk] = useState("");
  const [slots, setSlots] = useState<{ iso: string; label: string }[] | null>(
    null
  );
  const [slotsLoading, setSlotsLoading] = useState(false);
  const router = useRouter();

  function setOpen(next: boolean) {
    if (!controlled) setInnerOpen(next);
    onOpenChange?.(next);
  }

  function reset() {
    setStartDate(datePart(booking));
    setStartTime(timePart(booking));
    setDepositCzk(
      String(
        Math.round(
          (booking.serviceDepositMinor ?? booking.defaultDepositCents) / 100
        )
      )
    );
    setPriceCzk(
      booking.servicePriceMinor
        ? String(Math.round(booking.servicePriceMinor / 100))
        : ""
    );
  }

  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !startDate) return;
    let cancelled = false;
    setSlotsLoading(true);
    getSuggestedSlots({ bookingId: booking.id, dayKey: startDate })
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
  }, [open, startDate, booking.id]);

  const depositIsZero = depositCzk.trim() !== "" && Number(depositCzk) === 0;

  async function onApprove() {
    const startIso =
      startDate && startTime
        ? new Date(`${startDate}T${startTime}`).toISOString()
        : "";
    if (!startIso) {
      toast.error("Vyberte datum a čas schválení.");
      return;
    }
    setPending(true);
    const result = await approveBookingAction({
      bookingId: booking.id,
      startIso,
      depositCzk: depositCzk.trim() !== "" ? Number(depositCzk) : undefined,
      priceCzk: priceCzk.trim() !== "" ? Number(priceCzk) : undefined,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(
        ERROR_MESSAGES[result.error ?? "UNKNOWN"] ?? ERROR_MESSAGES.UNKNOWN
      );
      return;
    }
    toast.success(
      depositIsZero
        ? "Poptávka schválena – termín potvrzen, klient dostal e-mail."
        : "Poptávka schválena – odkaz na zálohu odeslán klientovi."
    );
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schválit poptávku</DialogTitle>
          <DialogDescription>
            {booking.clientName}
            {booking.serviceTitle ? ` · ${booking.serviceTitle}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`approve-date-${booking.id}`}>Datum</Label>
            <DateField
              id={`approve-date-${booking.id}`}
              value={startDate}
              onChange={setStartDate}
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
                  const active = slot.label === startTime;
                  return (
                    <button
                      key={slot.iso}
                      type="button"
                      onClick={() => setStartTime(slot.label)}
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
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Pro tento den nejsou podle pracovní doby volné termíny.
                </p>
                <Input
                  type="time"
                  aria-label="Čas"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-32"
                />
              </div>
            )}
          </div>

          {slots && slots.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                Vybraný čas
              </span>
              <Input
                type="time"
                aria-label="Čas"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="h-8 w-28"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`approve-price-${booking.id}`}>Cena (Kč)</Label>
              <Input
                id={`approve-price-${booking.id}`}
                type="number"
                min={0}
                step={100}
                value={priceCzk}
                onChange={(event) => setPriceCzk(event.target.value)}
                placeholder="Dle domluvy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`approve-deposit-${booking.id}`}>
                Záloha (Kč)
              </Label>
              <Input
                id={`approve-deposit-${booking.id}`}
                type="number"
                min={0}
                step={50}
                value={depositCzk}
                onChange={(event) => setDepositCzk(event.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {depositIsZero
              ? "Bez zálohy – termín se potvrdí okamžitě, klient dostane e-mail."
              : `Klient dostane e-mail s QR platbou na váš účet – termín potvrdíte po přijetí platby.`}
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
            onClick={onApprove}
            disabled={pending || !startDate || !startTime}
          >
            {pending ? "Schvaluji…" : "Schválit a poslat zálohu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
