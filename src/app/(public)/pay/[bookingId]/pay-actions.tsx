"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyIcon, CreditCardIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startCardCheckout } from "./actions";

type Props = {
  bookingId: string;
  qrDataUri: string | null;
  iban: string | null;
  variableSymbol: string | null;
  amountLabel: string;
  cardAvailable: boolean;
};

export function PayActions({
  bookingId,
  qrDataUri,
  iban,
  variableSymbol,
  amountLabel,
  cardAvailable,
}: Props) {
  const [paying, setPaying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [router]);

  async function onCard() {
    setPaying(true);
    const result = await startCardCheckout(bookingId);
    setPaying(false);
    if (!result.ok) {
      toast.error(
        result.error === "EXPIRED"
          ? "Platnost rezervace vypršela – kontaktujte prosím tatéra."
          : "Platbu kartou se nepodařilo spustit. Zkuste to znovu."
      );
      return;
    }
    window.location.href = result.url;
  }

  function copy(value: string, label: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} zkopírován`))
      .catch(() => toast.error("Kopírování se nezdařilo"));
  }

  return (
    <div className="space-y-5">
      {qrDataUri && (
        <div className="space-y-3 rounded-2xl border p-5 text-center">
          <p className="font-display text-lg font-semibold">
            Zaplaťte převodem
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUri}
            alt="QR platba"
            width={220}
            height={220}
            className="mx-auto rounded-xl"
          />
          <p className="text-sm text-muted-foreground">
            Otevřete aplikaci své banky a naskenujte QR kód.
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground">Účet:</span>
              <span className="font-medium">{iban}</span>
              <button
                type="button"
                aria-label="Zkopírovat účet"
                onClick={() => copy(iban!, "Účet")}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <CopyIcon className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground">Variabilní symbol:</span>
              <span className="font-medium tabular-nums">{variableSymbol}</span>
              <button
                type="button"
                aria-label="Zkopírovat variabilní symbol"
                onClick={() => copy(variableSymbol!, "Variabilní symbol")}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <CopyIcon className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground">Částka:</span>
              <span className="font-medium tabular-nums">{amountLabel}</span>
            </div>
          </div>
        </div>
      )}

      {cardAvailable && (
        <div className="space-y-3 rounded-2xl border p-5 text-center">
          <p className="font-display text-lg font-semibold">
            Nebo zaplaťte kartou
          </p>
          <p className="text-sm text-muted-foreground">
            Apple Pay, Google Pay i běžná karta – termín se potvrdí okamžitě.
          </p>
          <Button
            type="button"
            onClick={onCard}
            disabled={paying}
            className="w-full font-semibold"
          >
            <CreditCardIcon data-icon="inline-start" />
            {paying ? "Otevírám platbu…" : `Zaplatit kartou ${amountLabel}`}
          </Button>
        </div>
      )}
    </div>
  );
}
