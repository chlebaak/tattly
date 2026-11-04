"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClockIcon,
  CheckIcon,
  HelpCircleIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitClientRequest,
  submitRefundIban,
} from "@/app/(public)/(site)/booking/actions";

type RequestKind = "reschedule" | "cancel" | "question";

const KINDS: { kind: RequestKind; label: string; icon: typeof XIcon }[] = [
  { kind: "reschedule", label: "Potřebuji přesunout termín", icon: CalendarClockIcon },
  { kind: "cancel", label: "Nemůžu dorazit", icon: XIcon },
  { kind: "question", label: "Mám dotaz", icon: HelpCircleIcon },
];

export function ClientRequestActions({
  code,
  hasOpenRequest,
  openRequestKind,
}: {
  code: string;
  hasOpenRequest: boolean;
  openRequestKind: RequestKind | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<RequestKind | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(hasOpenRequest);

  function send(kind: RequestKind, text?: string) {
    startTransition(async () => {
      const result = await submitClientRequest({
        code,
        kind,
        message: text?.trim() || undefined,
      });
      if (!result.ok) {
        toast.error("Nepodařilo se odeslat. Zkuste to prosím znovu.");
        return;
      }
      setSent(true);
      setActive(null);
      setMessage("");
      toast.success("Poslali jsme to tatérovi – ozve se vám.");
      router.refresh();
    });
  }

  if (sent) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-status-waiting-soft px-3 py-2 text-sm text-status-waiting">
        <CheckIcon className="mt-0.5 size-4 shrink-0" />
        {openRequestKind === "question"
          ? "Dotaz jsme předali tatérovi."
          : "Požadavek jsme předali tatérovi."}{" "}
        Ozve se vám e-mailem.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((item) => (
          <Button
            key={item.kind}
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (item.kind === "question") {
                setActive(active === "question" ? null : "question");
                return;
              }
              send(item.kind);
            }}
          >
            <item.icon data-icon="inline-start" />
            {item.label}
          </Button>
        ))}
      </div>

      {active === "question" && (
        <div className="space-y-2 rounded-xl border p-3">
          <Label htmlFor="question">Na co se chcete zeptat?</Label>
          <Textarea
            id="question"
            rows={3}
            maxLength={300}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Např.: Bude to stačit na předloktí? Můžu přijít o hodinu dřív?"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {message.length}/300
            </span>
            <Button
              type="button"
              size="sm"
              disabled={pending || message.trim().length < 2}
              onClick={() => send("question", message)}
            >
              {pending ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : null}
              Odeslat dotaz
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RefundIbanForm({ code }: { code: string }) {
  const router = useRouter();
  const [iban, setIban] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const value = iban.replace(/\s+/g, "").toUpperCase();
    if (value.length < 15) {
      setError("Zadejte prosím celé číslo účtu (IBAN), např. CZ6508000000192000145399.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitRefundIban({ code, iban: value });
      if (!result.ok) {
        setError("Číslo účtu se nepodařilo uložit. Zkontrolujte ho prosím.");
        return;
      }
      toast.success("Díky! Tatér teď může zálohu vrátit.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="refund-iban">Číslo účtu (IBAN) pro vrácení zálohy</Label>
        <Input
          id="refund-iban"
          value={iban}
          onChange={(event) => setIban(event.target.value)}
          spellCheck={false}
          placeholder="CZ6508000000192000145399"
          className={cn(error && "border-destructive")}
        />
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button type="button" size="sm" disabled={pending} onClick={submit}>
        {pending ? (
          <Loader2Icon className="animate-spin" data-icon="inline-start" />
        ) : null}
        Uložit číslo účtu
      </Button>
    </div>
  );
}

export function StatusCodeLookup({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const value = code.trim().toUpperCase();
        if (!value) return;
        router.push(`/booking/status?code=${encodeURIComponent(value)}`);
      }}
      className="space-y-3"
    >
      <div className="space-y-2">
        <Label htmlFor="status-code">Kód rezervace</Label>
        <Input
          id="status-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="např. ZU4S-MU5K"
          spellCheck={false}
          autoComplete="off"
          className="font-mono tracking-wider uppercase"
        />
        <p className="text-xs text-muted-foreground">
          Kód najdete v každém e-mailu k rezervaci.
        </p>
      </div>
      <Button type="submit" className="w-full">
        Zobrazit stav rezervace
      </Button>
    </form>
  );
}
