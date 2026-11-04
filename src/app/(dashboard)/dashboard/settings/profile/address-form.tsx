"use client";

import { useActionState, useState } from "react";
import { updateAddress, type ProfileActionState } from "../actions";
import { AddressField, type AddressValue } from "@/components/address-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveRow } from "../form-status";

export function AddressForm({
  addressLine,
  city,
  zip,
  lat,
  lng,
}: {
  addressLine: string | null;
  city: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updateAddress, null);
  const [address, setAddress] = useState<AddressValue>({
    addressLine: addressLine ?? "",
    city: city ?? "",
    zip: zip ?? "",
    lat,
    lng,
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="addressLine" value={address.addressLine} />
      <input type="hidden" name="city" value={address.city} />
      <input type="hidden" name="zip" value={address.zip} />
      <input type="hidden" name="lat" value={address.lat ?? ""} />
      <input type="hidden" name="lng" value={address.lng ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="address">Adresa</Label>
        <AddressField
          id="address"
          value={address.addressLine}
          onChange={setAddress}
          placeholder="Začněte psát adresu…"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="address-city">Město</Label>
          <Input
            id="address-city"
            value={address.city}
            onChange={(event) =>
              setAddress((current) => ({
                ...current,
                city: event.target.value,
              }))
            }
            autoComplete="address-level2"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-zip">PSČ</Label>
          <Input
            id="address-zip"
            value={address.zip}
            onChange={(event) =>
              setAddress((current) => ({ ...current, zip: event.target.value }))
            }
            autoComplete="postal-code"
            maxLength={12}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Veřejně se zobrazuje jen město. Celou adresu dostane klient e-mailem po
        zaplacení zálohy.
      </p>

      <SaveRow pending={pending} state={state} label="Uložit adresu" />
    </form>
  );
}
