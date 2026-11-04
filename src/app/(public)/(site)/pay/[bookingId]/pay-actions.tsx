"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  Loader2Icon,
  Share2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markDepositSent } from "@/app/(public)/(site)/booking/actions";

export function PayActions({
  bookingId,
  qrDataUri,
  iban,
  variableSymbol,
  amountLabel,
  artistName,
  paidMarked,
}: {
  bookingId: string;
  qrDataUri: string | null;
  iban: string | null;
  variableSymbol: string | null;
  amountLabel: string;
  artistName: string;
  paidMarked: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [marked, setMarked] = useState(paidMarked);
  const router = useRouter();

  // Dokud je stránka otevřená, občas zkontrolujeme stav (tatér mohl potvrdit).
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    timer = setInterval(tick, 20000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [router]);

  async function copyAll() {
    const lines = [
      `Částka: ${amountLabel}`,
      iban ? `IBAN: ${iban}` : null,
      variableSymbol ? `Variabilní symbol: ${variableSymbol}` : null,
      `Příjemce: ${artistName}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Platební údaje zkopírovány");
    } catch {
      toast.error("Kopírování se nezdařilo");
    }
  }

  async function shareQr() {
    if (!qrDataUri) return;
    try {
      const blob = await (await fetch(qrDataUri)).blob();
      const file = new File([blob], "qr-platba.png", { type: "image/png" });
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "QR platba zálohy",
          text: `Záloha ${amountLabel} – ${artistName}`,
        });
        return;
      }
      // Fallback: rovnou stáhnout
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "qr-platba.png";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("QR kód uložen do souborů");
    } catch {
      toast.error("Sdílení se nezdařilo, zkuste QR uložit.");
    }
  }

  async function markPaid() {
    setPending(true);
    const result = await markDepositSent(bookingId);
    setPending(false);
    if (!result.ok) {
      toast.error("Nepodařilo se označit platbu. Zkuste to znovu.");
      return;
    }
    setMarked(true);
    toast.success("Díky! Dali jsme tatérovi vědět, aby platbu zkontroloval.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {qrDataUri ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border bg-card p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUri}
            alt="QR platba"
            width={220}
            height={220}
            className="size-52 rounded-lg"
          />
          <div className="text-center text-sm">
            {iban && (
              <p className="text-muted-foreground">
                Účet: <span className="font-medium text-foreground">{iban}</span>
              </p>
            )}
            {variableSymbol && (
              <p className="text-muted-foreground">
                Variabilní symbol:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {variableSymbol}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" size="sm" onClick={shareQr}>
              <Share2Icon data-icon="inline-start" />
              Sdílet QR do banky
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={qrDataUri} download="qr-platba.png">
                <DownloadIcon data-icon="inline-start" />
                Uložit QR
              </a>
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={copyAll}>
              <CopyIcon data-icon="inline-start" />
              Kopírovat údaje
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Tatér nemá vyplněný bankovní účet. Ozvěte se mu prosím přímo a
          domluvte se na platbě.
        </p>
      )}

      <ol className="space-y-2 rounded-[18px] border bg-muted/30 p-4 text-sm">
        <li className="flex gap-2">
          <span className="font-semibold tabular-nums">1.</span>
          Otevřete aplikaci své banky a zvolte <strong>QR Platba</strong>.
        </li>
        <li className="flex gap-2">
          <span className="font-semibold tabular-nums">2.</span>
          Naskenujte kód (můžete ho i uložit nebo sdílet z tohoto telefonu).
        </li>
        <li className="flex gap-2">
          <span className="font-semibold tabular-nums">3.</span>
          Zkontrolujte částku {amountLabel} a platbu odešlete.
        </li>
      </ol>

      {marked ? (
        <p className="flex items-start gap-2 rounded-xl bg-status-waiting-soft px-3 py-2 text-sm text-status-waiting">
          <CheckIcon className="mt-0.5 size-4 shrink-0" />
          Platbu jsme zaznamenali a dali tatérovi vědět. Termín potvrdíme, jakmile
          platba dorazí.
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending || !qrDataUri}
          onClick={markPaid}
        >
          {pending ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          Už jsem zálohu odeslal(a)
        </Button>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Stránka se aktualizuje sama – jakmile tatér platbu potvrdí, uvidíte to
        tady.
      </p>
    </div>
  );
}
