"use client";

import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProfileActionState } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: "Zkontrolujte prosím vyplněné údaje.",
  SLUG_INVALID: "Adresa musí mít alespoň 3 znaky (písmena, čísla a pomlčky).",
  SLUG_TAKEN: "Tato adresa je už obsazená. Zkuste jinou.",
  UNKNOWN: "Něco se pokazilo. Zkuste to znovu.",
};

export function FormStatus({ state }: { state: ProfileActionState }) {
  if (!state) return null;
  if (state.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-status-ok">
        <CheckIcon className="size-4" />
        Uloženo
      </span>
    );
  }
  return (
    <span className="text-sm text-destructive">
      {ERROR_MESSAGES[state.error ?? "UNKNOWN"] ?? ERROR_MESSAGES.UNKNOWN}
    </span>
  );
}

export function SaveRow({
  pending,
  state,
  label = "Uložit",
}: {
  pending: boolean;
  state: ProfileActionState;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <FormStatus state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Ukládám…" : label}
      </Button>
    </div>
  );
}
