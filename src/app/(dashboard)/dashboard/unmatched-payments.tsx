"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, LandmarkIcon, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { plural } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignBankTransaction } from "./actions";

export type UnmatchedPayment = {
  id: string;
  bookedAtLabel: string;
  amountLabel: string;
  amountMinor: number;
  variableSymbol: string | null;
  message: string | null;
  counterpartyAccount: string | null;
};

export type PendingBookingOption = {
  id: string;
  label: string;
  amountMinor: number | null;
};

export function UnmatchedPayments({
  payments,
  candidates,
}: {
  payments: UnmatchedPayment[];
  candidates: PendingBookingOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<UnmatchedPayment | null>(null);
  const [bookingId, setBookingId] = useState<string>("");

  if (payments.length === 0) return null;

  function open(payment: UnmatchedPayment) {
    const suggestion = candidates.find(
      (candidate) => candidate.amountMinor === payment.amountMinor
    );
    setBookingId(suggestion?.id ?? "");
    setActive(payment);
  }

  function assign() {
    if (!active || !bookingId) return;
    startTransition(async () => {
      const result = await assignBankTransaction({
        transactionId: active.id,
        bookingId,
      });
      if (!result.ok) {
        toast.error(
          result.error === "INVALID_STATE"
            ? "Rezervace už není ve stavu čekání na zálohu."
            : "Přiřazení se nezdařilo."
        );
        return;
      }
      toast.success("Platba přiřazena – termín je potvrzený.");
      setActive(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-[18px] border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-attention-soft text-status-attention">
          <LandmarkIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {payments.length}{" "}
            {plural(
              payments.length,
              "platba čeká",
              "platby čekají",
              "plateb čeká"
            )}{" "}
            na přiřazení
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Na účet dorazily peníze, které neodpovídají žádné rezervaci
            (chybějící nebo jiný variabilní symbol, jiná částka).
          </p>

          <ul className="mt-3 divide-y divide-border">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium tabular-nums">
                    {payment.amountLabel}
                    {payment.variableSymbol ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        VS {payment.variableSymbol}
                      </span>
                    ) : (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        bez variabilního symbolu
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.bookedAtLabel}
                    {payment.counterpartyAccount
                      ? ` · z účtu ${payment.counterpartyAccount}`
                      : ""}
                    {payment.message ? ` · „${payment.message}“` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => open(payment)}
                >
                  <LinkIcon data-icon="inline-start" />
                  Přiřadit k rezervaci
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Dialog
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Přiřadit platbu k rezervaci</DialogTitle>
            <DialogDescription>
              {active
                ? `${active.amountLabel} · ${active.bookedAtLabel}. Po přiřazení se rezervace potvrdí a klient dostane e-mail.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Teď není žádná rezervace, která by čekala na zálohu. Platbu
              přiřadíte, až nějaká vznikne.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="assign-booking">Rezervace</Label>
              <Select value={bookingId} onValueChange={setBookingId}>
                <SelectTrigger id="assign-booking" className="w-full">
                  <SelectValue placeholder="Vyberte rezervaci" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {active && candidates.some((c) => c.amountMinor === active.amountMinor) && (
                <p className="text-xs text-muted-foreground">
                  <Badge variant="secondary" className="mr-1.5">
                    Tip
                  </Badge>
                  Předvybrali jsme rezervaci se stejnou částkou.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActive(null)}
              disabled={pending}
            >
              Zavřít
            </Button>
            <Button
              type="button"
              onClick={assign}
              disabled={pending || !bookingId}
            >
              {pending ? "Přiřazuji…" : "Přiřadit a potvrdit"}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
