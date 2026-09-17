"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelBooking, completeBooking } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: "Zkontrolujte zadané údaje.",
  INVALID_STATE: "Rezervace už je v jiném stavu.",
  REFUND_FAILED:
    "Refundace se nezdařila, rezervace zůstala nezměněná. Zkuste ji stornovat po ruční refundaci ve Stripe.",
  UNKNOWN: "Něco se pokazilo. Zkuste to znovu.",
};

type Props = {
  bookingId: string;
  status: "confirmed" | "deposit_pending";
};

export function BookingManageActions({ bookingId, status }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const router = useRouter();

  async function run(
    key: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    confirmText?: string
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(key);
    const result = await action();
    setPending(null);
    if (!result.ok) {
      toast.error(
        ERROR_MESSAGES[result.error ?? "UNKNOWN"] ?? ERROR_MESSAGES.UNKNOWN
      );
      return;
    }
    router.refresh();
  }

  const busy = pending !== null;

  if (status === "deposit_pending") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() =>
          run(
            "cancel",
            () => cancelBooking({ bookingId, refund: true }),
            "Stornovat rezervaci? Záloha se vrátí, pokud už byla zaplacena."
          )
        }
      >
        {pending === "cancel" ? "Storuji…" : "Stornovat"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() =>
          run(
            "complete",
            () => completeBooking({ bookingId }),
            "Označit rezervaci jako splněnou?"
          )
        }
      >
        {pending === "complete" ? "Ukládám…" : "Splněno"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={busy}
        onClick={() =>
          run(
            "cancel-refund",
            () => cancelBooking({ bookingId, refund: true }),
            "Stornovat rezervaci a vrátit klientovi zálohu?"
          )
        }
      >
        {pending === "cancel-refund" ? "Storuji…" : "Stornovat a vrátit zálohu"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() =>
          run(
            "cancel-norefund",
            () => cancelBooking({ bookingId, refund: false }),
            "Stornovat rezervaci BEZ vrácení zálohy (no-show)?"
          )
        }
      >
        {pending === "cancel-norefund" ? "Storuji…" : "Stornovat bez vrácení"}
      </Button>
    </div>
  );
}
