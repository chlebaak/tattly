"use client";

import { useActionState } from "react";
import { updateBilling, type ProfileActionState } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveRow } from "../form-status";

export function BillingForm({
  defaultDepositCzk,
  ico,
  dic,
  bankAccount,
}: {
  defaultDepositCzk: number;
  ico: string | null;
  dic: string | null;
  bankAccount: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updateBilling, null);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="defaultDepositCzk">Výchozí záloha (Kč)</Label>
        <Input
          id="defaultDepositCzk"
          name="defaultDepositCzk"
          type="number"
          min={0}
          step={50}
          required
          defaultValue={defaultDepositCzk}
          className="max-w-40"
        />
        <p className="text-xs text-muted-foreground">
          Předvyplní se při schvalování poptávky. U jednotlivých služeb ji můžete
          přepsat.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccount">Bankovní účet (IBAN)</Label>
        <Input
          id="bankAccount"
          name="bankAccount"
          spellCheck={false}
          maxLength={64}
          defaultValue={bankAccount ?? ""}
          placeholder="CZ6508000000192000145399"
        />
        <p className="text-xs text-muted-foreground">
          Pro QR platbu zálohy a platbu faktur. Bez účtu pošleme fakturu bez QR
          kódu.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ico">IČO</Label>
          <Input
            id="ico"
            name="ico"
            inputMode="numeric"
            maxLength={16}
            defaultValue={ico ?? ""}
            placeholder="12345678"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dic">DIČ (nepovinné)</Label>
          <Input
            id="dic"
            name="dic"
            maxLength={16}
            defaultValue={dic ?? ""}
            placeholder="CZ12345678"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Údaje se objeví na faktuře, kterou klient dostane po dokončení sezení.
      </p>

      <SaveRow pending={pending} state={state} label="Uložit platby" />
    </form>
  );
}
