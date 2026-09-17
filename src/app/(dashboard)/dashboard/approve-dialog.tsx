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
import { approveBookingAction } from "./actions";
import type { BookingView } from "./booking-view";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: "Zkontrolujte zadané údaje.",
  NOT_FOUND: "Poptávka nenalezena.",
  INVALID_STATE: "Poptávka už není ke schválení.",
  SLOT_TAKEN: "Termín je už obsazený jinou rezervací – vyberte jiný.",
  NEEDS_PAYMENT_SETUP:
    "Nejdřív vyplňte bankovní účet (Nastavení → Profil → Fakturace) nebo připojte Stripe.",
  STRIPE_ERROR: "Nepodařilo se vytvořit platbu. Zkuste to znovu.",
  UNKNOWN: "Něco se pokazilo. Zkuste to znovu.",
};

export function ApproveDialog({ booking }: { booking: BookingView }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [startDate, setStartDate] = useState(
    booking.proposedStartValue?.split("T")[0] ?? ""
  );
  const [startTime, setStartTime] = useState(
    booking.proposedStartValue?.split("T")[1]?.slice(0, 5) ?? ""
  );
  const [depositCzk, setDepositCzk] = useState(
    String(
      Math.round(
        (booking.serviceDepositMinor ?? booking.defaultDepositCents) / 100
      )
    )
  );
  const [priceCzk, setPriceCzk] = useState(
    booking.servicePriceMinor
      ? String(Math.round(booking.servicePriceMinor / 100))
      : ""
  );
  const router = useRouter();

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
      depositCzk:
        depositCzk.trim() !== "" ? Number(depositCzk) : undefined,
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setStartDate(booking.proposedStartValue?.split("T")[0] ?? "");
          setStartTime(
            booking.proposedStartValue?.split("T")[1]?.slice(0, 5) ?? ""
          );
          setDepositCzk(
            String(
              Math.round(
                (booking.serviceDepositMinor ?? booking.defaultDepositCents) /
                  100
              )
            )
          );
          setPriceCzk(
            booking.servicePriceMinor
              ? String(Math.round(booking.servicePriceMinor / 100))
              : ""
          );
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Schválit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Schválit poptávku</DialogTitle>
          <DialogDescription>
            {booking.clientName}
            {booking.serviceTitle ? ` · ${booking.serviceTitle}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
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
              <Label htmlFor={`approve-time-${booking.id}`}>Čas</Label>
              <Input
                id={`approve-time-${booking.id}`}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`approve-price-${booking.id}`}>
                Cena (Kč)
              </Label>
              <Input
                id={`approve-price-${booking.id}`}
                type="number"
                min={0}
                step={100}
                value={priceCzk}
                onChange={(e) => setPriceCzk(e.target.value)}
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
                onChange={(e) => setDepositCzk(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {depositIsZero
              ? "Bez zálohy – termín se potvrdí okamžitě, klient dostane e-mail."
              : `Klient dostane e-mail s ${
                  booking.qrAvailable && booking.cardAvailable
                    ? "QR platbou i možností karty"
                    : booking.qrAvailable
                      ? "QR platbou (převodem)"
                      : "platbou kartou"
                } – potvrdíte po přijetí platby.`}
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
