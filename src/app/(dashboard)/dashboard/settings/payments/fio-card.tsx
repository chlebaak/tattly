"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  InfoIcon,
  LandmarkIcon,
  Loader2Icon,
  RefreshCwIcon,
  UnplugIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { plural } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  connectFioAccount,
  disconnectFioAccount,
  syncFioNow,
  type FioActionState,
} from "./fio-actions";

export type FioConnectionView = {
  id: string;
  label: string | null;
  accountNumber: string | null;
  status: string;
  lastSyncedLabel: string | null;
  lastError: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN:
    "Token nevypadá správně, nebo ho Fio odmítlo. Zkontrolujte, že jste zkopírovali celý token z internetbankingu.",
  RATE_LIMITED:
    "Fio teď odmítá další dotazy (limit je jeden za 30 sekund). Zkuste to prosím za chvíli.",
  TOO_MANY: "Napojit lze nejvýše tři účty.",
  UNKNOWN: "Propojení se nezdařilo. Zkuste to prosím znovu.",
};

const GUIDE = [
  "Přihlaste se do Fio internetbankingu",
  "Vpravo nahoře Nastavení → záložka API → zřídit token",
  "Vyberte Sledování účtu, platnost 180 dní, a token zkopírujte sem",
];

export function FioCard({
  connections,
  matchedCount,
  unmatchedCount,
}: {
  connections: FioConnectionView[];
  matchedCount: number;
  unmatchedCount: number;
}) {
  const [state, formAction, pending] = useActionState<FioActionState, FormData>(
    connectFioAccount,
    null
  );

  return (
    <div className="space-y-4">
      {connections.map((connection) => (
        <ConnectionRow key={connection.id} connection={connection} />
      ))}

      {connections.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Za posledních 30 dní:{" "}
            <strong className="text-foreground">{matchedCount}</strong>{" "}
            automaticky spárováno
          </span>
          {unmatchedCount > 0 && (
            <span>
              <strong className="text-foreground">{unmatchedCount}</strong>{" "}
              {plural(
                unmatchedCount,
                "příchozí platba",
                "příchozí platby",
                "příchozích plateb"
              )}{" "}
              bez rezervace
            </span>
          )}
        </div>
      )}

      {connections.length < 3 && (
        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <LandmarkIcon className="size-4" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {connections.length > 0
                  ? "Připojit další účet"
                  : "Zapnout automatickou kontrolu plateb"}
              </p>
              <p className="text-xs text-muted-foreground">
                Když nám dáte přístup k pohybům na účtu u Fio banky, poznáme
                platbu zálohy podle variabilního symbolu a termín potvrdíme
                sami. Peníze jdou pořád jen k vám – máme právo pouze číst.
              </p>
            </div>
          </div>

          <ol className="space-y-1.5 text-sm text-muted-foreground">
            {GUIDE.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold text-foreground tabular-nums">
                  {index + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>

          <form action={formAction} className="space-y-3">
            {state?.ok ? (
              <p className="inline-flex items-center gap-2 rounded-xl bg-status-ok-soft px-3 py-2 text-sm text-status-ok">
                <CheckCircle2Icon className="size-4" />
                Propojeno
                {state.accountNumber ? ` – účet ${state.accountNumber}` : ""}.
                Platby teď kontrolujeme sami.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fio-token">Token z Fio</Label>
                  <Input
                    id="fio-token"
                    name="token"
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="vložte token z internetbankingu"
                    aria-invalid={Boolean(state && !state.ok)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fio-label">Označení (nepovinné)</Label>
                  <Input
                    id="fio-label"
                    name="label"
                    maxLength={120}
                    placeholder="např. živnostenský účet"
                  />
                </div>
                {state && !state.ok && (
                  <p className="text-sm text-destructive" role="alert">
                    {ERROR_MESSAGES[state.error ?? "UNKNOWN"] ??
                      ERROR_MESSAGES.UNKNOWN}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <Loader2Icon
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    ) : null}
                    {pending ? "Ověřuji…" : "Ověřit a propojit"}
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <a
                      href="https://ib.fio.cz/ib/login"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLinkIcon data-icon="inline-start" />
                      Otevřít Fio internetbanking
                    </a>
                  </Button>
                </div>
              </>
            )}
          </form>

          <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            Token platí 180 dní a Fio vám ho automaticky prodlouží při každém
            přihlášení do internetbankingu. Zrušit ho můžete kdykoli ve Fiu,
            nebo tlačítkem Odpojit tady.
          </p>
        </div>
      )}
    </div>
  );
}

function ConnectionRow({ connection }: { connection: FioConnectionView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const expired = connection.status === "expired";
  const broken = connection.status === "error";

  function sync() {
    startTransition(async () => {
      const result = await syncFioNow(connection.id);
      if (!result.ok) {
        toast.error(
          result.error === "UNAUTHORIZED"
            ? "Fio token vypršel – vytvořte prosím nový."
            : result.error === "RATE_LIMITED"
              ? "Fio má limit jeden dotaz za 30 sekund. Zkuste to za chvíli."
              : "Kontrola se nezdařila."
        );
        router.refresh();
        return;
      }
      toast.success(
        result.imported === 0
          ? "Zkontrolováno – žádné nové platby."
          : `Našli jsme ${result.imported} ${plural(result.imported, "nový pohyb", "nové pohyby", "nových pohybů")}` +
              (result.matched > 0
                ? `, ${result.matched} ${plural(result.matched, "spárován", "spárovány", "spárováno")} s rezervací.`
                : ".")
      );
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4",
        expired || broken ? "border-status-attention/40" : "bg-status-ok-soft/40"
      )}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <LandmarkIcon className="size-4 text-muted-foreground" />
          {connection.label ?? "Fio účet"}
          <span className="text-muted-foreground">
            {connection.accountNumber ?? ""}
          </span>
          {expired ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-attention-soft px-2 py-0.5 text-[11px] font-medium text-status-attention">
              <AlertTriangleIcon className="size-3" />
              Token vypršel
            </span>
          ) : broken ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-attention-soft px-2 py-0.5 text-[11px] font-medium text-status-attention">
              <AlertTriangleIcon className="size-3" />
              Chyba připojení
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-ok-soft px-2 py-0.5 text-[11px] font-medium text-status-ok">
              <CheckCircle2Icon className="size-3" />
              Aktivní
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {connection.lastSyncedLabel
            ? `Naposledy zkontrolováno ${connection.lastSyncedLabel}`
            : "Zatím neproběhla kontrola"}
          {expired
            ? " – ve Fiu vytvořte nový token a vložte ho sem."
            : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={sync}
        >
          {pending ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <RefreshCwIcon data-icon="inline-start" />
          )}
          {pending ? "Kontroluji…" : "Zkontrolovat teď"}
        </Button>
        <ConfirmDialog
          trigger={
            <Button type="button" size="sm" variant="ghost" disabled={pending}>
              <UnplugIcon data-icon="inline-start" />
              Odpojit
            </Button>
          }
          title="Odpojit tento účet?"
          description="Přestaneme číst pohyby na účtu a platby záloh budete potvrzovat ručně. Už spárované platby zůstanou u rezervací."
          confirmLabel="Odpojit"
          tone="destructive"
          onConfirm={() => {
            startTransition(async () => {
              const result = await disconnectFioAccount(connection.id);
              if (!result.ok) {
                toast.error("Odpojení se nezdařilo.");
                return;
              }
              toast.success("Účet odpojen.");
              router.refresh();
            });
          }}
        />
      </div>
    </div>
  );
}
