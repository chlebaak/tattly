"use client";

import { useActionState, useState } from "react";
import { updateProfile, type ProfileActionState } from "./actions";
import { AddressField, type AddressValue } from "@/components/address-field";
import { PanelSection } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  defaultDepositCzk: number;
  slug: string;
  addressLine: string | null;
  city: string | null;
  zip: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  studioName: string | null;
  styles: string | null;
  ico: string | null;
  dic: string | null;
  bankAccount: string | null;
};

export function ProfileForm({
  displayName,
  bio,
  avatarUrl,
  defaultDepositCzk,
  slug,
  addressLine,
  city,
  zip,
  website,
  instagram,
  tiktok,
  facebook,
  studioName,
  styles,
  ico,
  dic,
  bankAccount,
}: Props) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updateProfile, null);
  const [address, setAddress] = useState<AddressValue>({
    addressLine: addressLine ?? "",
    city: city ?? "",
    zip: zip ?? "",
    lat: null,
    lng: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="addressLine" value={address.addressLine} />
      <input type="hidden" name="city" value={address.city} />
      <input type="hidden" name="zip" value={address.zip} />
      <input
        type="hidden"
        name="lat"
        value={address.lat ?? ""}
      />
      <input
        type="hidden"
        name="lng"
        value={address.lng ?? ""}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Jméno / název</Label>
          <Input
            id="displayName"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            defaultValue={displayName}
          />
        </div>
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
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={2000}
          defaultValue={bio ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="avatarUrl">Avatar URL (volitelné)</Label>
        <Input
          id="avatarUrl"
          name="url"
          type="url"
          spellCheck={false}
          maxLength={500}
          defaultValue={avatarUrl ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Veřejný profil: /artist/{slug}
        </p>
      </div>

      <PanelSection
        title="Adresa podniku"
        description="Veřejně se zobrazuje jen město. Celou adresu dostane klient e-mailem po zaplacení zálohy."
      >
        <AddressField
          id="address"
          value={address.addressLine}
          onChange={setAddress}
          placeholder={addressLine || "Začni psát adresu…"}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="address-city">Město</Label>
            <Input
              id="address-city"
              value={address.city}
              onChange={(e) =>
                setAddress((a) => ({ ...a, city: e.target.value }))
              }
              autoComplete="address-level2"
              maxLength={120}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address-zip">PSČ</Label>
            <Input
              id="address-zip"
              value={address.zip}
              onChange={(e) =>
                setAddress((a) => ({ ...a, zip: e.target.value }))
              }
              autoComplete="postal-code"
              maxLength={12}
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection
        title="Odkazy a sociální sítě"
        description="Zobrazí se na tvé veřejné stránce. Prázdné pole se nezobrazuje."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="website">Web</Label>
            <Input
              id="website"
              name="website"
              type="url"
              spellCheck={false}
              autoComplete="url"
              maxLength={255}
              defaultValue={website ?? ""}
              placeholder="https://tvujweb.cz"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              name="instagram"
              type="url"
              spellCheck={false}
              autoComplete="off"
              maxLength={255}
              defaultValue={instagram ?? ""}
              placeholder="https://instagram.com/tvujprofil"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tiktok">TikTok</Label>
            <Input
              id="tiktok"
              name="tiktok"
              type="url"
              spellCheck={false}
              autoComplete="off"
              maxLength={255}
              defaultValue={tiktok ?? ""}
              placeholder="https://tiktok.com/@tvujprofil"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              name="facebook"
              type="url"
              spellCheck={false}
              autoComplete="off"
              maxLength={255}
              defaultValue={facebook ?? ""}
              placeholder="https://facebook.com/tvujprofil"
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection title="O studiu">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="studioName">Název studia</Label>
            <Input
              id="studioName"
              name="organization"
              autoComplete="organization"
              maxLength={120}
              defaultValue={studioName ?? ""}
              placeholder="Ink & Bone Studio"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="styles">Specializace</Label>
            <Input
              id="styles"
              name="styles"
              maxLength={255}
              defaultValue={styles ?? ""}
              placeholder="realism, dotwork, fineline"
            />
            <p className="text-xs text-muted-foreground">
              Odděluj čárkou – zobrazí se jako štítky
            </p>
          </div>
        </div>
      </PanelSection>

      <PanelSection
        title="Fakturace"
        description="Údaje se objeví na faktuře, kterou klient dostane e-mailem po dokončení sezení."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
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
          <div className="space-y-1">
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
        <div className="space-y-1">
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
            Pro QR platbu na faktuře – bez účtu pošleme fakturu s platbou
            hotově.
          </p>
        </div>
      </PanelSection>

      {state && !state.ok && (
        <p className="text-sm text-destructive">Zkontrolujte zadané údaje.</p>
      )}
      {state?.ok && <p className="text-sm text-green-600">Uloženo.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Ukládám…" : "Uložit profil"}
      </Button>
    </form>
  );
}
