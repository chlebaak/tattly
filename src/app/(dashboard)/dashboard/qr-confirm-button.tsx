"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmQrPayment } from "./actions";

export function QrConfirmButton({
  bookingId,
  compact = false,
}: {
  bookingId: string;
  compact?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={async () => {
        if (
          !window.confirm(
            "Potvrdit přijetí zálohy? Klient dostane potvrzení a termín se zapíše do kalendáře."
          )
        )
          return;
        setPending(true);
        const result = await confirmQrPayment({ bookingId });
        setPending(false);
        if (!result.ok) {
          toast.error(
            result.error === "INVALID_STATE"
              ? "Rezervace už není ve stavu čekání na zálohu."
              : "Potvrzení se nezdařilo."
          );
          return;
        }
        toast.success("Záloha potvrzena – termín je potvrzený.");
        router.refresh();
      }}
    >
      <CheckIcon data-icon="inline-start" />
      {pending
        ? "Potvrzuji…"
        : compact
          ? "Potvrdit zálohu"
          : "Záloha přijata (QR)"}
    </Button>
  );
}
