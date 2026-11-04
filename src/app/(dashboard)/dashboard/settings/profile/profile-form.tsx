"use client";

import { useActionState, useEffect, useState } from "react";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { updatePublicProfile, type ProfileActionState } from "../actions";
import { AvatarUploader } from "@/components/avatar-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveRow } from "../form-status";
import { StylesInput } from "./styles-input";

export function ProfileForm({
  displayName,
  bio,
  avatarUrl,
  studioName,
  styles,
  website,
  instagram,
  tiktok,
  facebook,
}: {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  studioName: string | null;
  styles: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updatePublicProfile, null);

  const [name, setName] = useState(displayName);
  const [avatar, setAvatar] = useState(avatarUrl ?? "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (state?.ok) setTouched(false);
  }, [state]);

  useUnsavedChanges(touched);

  return (
    <form
      action={formAction}
      className="space-y-5"
      onInput={() => setTouched(true)}
    >
      <AvatarUploader
        name="avatarUrl"
        value={avatar}
        onChange={(url) => {
          setAvatar(url);
          setTouched(true);
        }}
        displayName={name}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Jméno nebo název</Label>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Pod tímto jménem vás uvidí klienti.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="studioName">Studio</Label>
          <Input
            id="studioName"
            name="studioName"
            autoComplete="organization"
            maxLength={120}
            defaultValue={studioName ?? ""}
            placeholder="Ink & Bone Studio"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">O mně</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={2000}
          defaultValue={bio ?? ""}
          placeholder="Pár vět o tom, co tvoříte a jak pracujete."
        />
      </div>

      <div className="space-y-2">
        <Label>Specializace</Label>
        <StylesInput name="styles" defaultValue={styles ?? ""} />
      </div>

      <div className="space-y-2">
        <Label>Odkazy</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            name="website"
            type="url"
            spellCheck={false}
            autoComplete="url"
            maxLength={255}
            defaultValue={website ?? ""}
            placeholder="Web (např. https://vasedomena.cz)"
            aria-label="Web"
          />
          <Input
            name="instagram"
            type="url"
            spellCheck={false}
            autoComplete="off"
            maxLength={255}
            defaultValue={instagram ?? ""}
            placeholder="Instagram"
            aria-label="Instagram"
          />
          <Input
            name="tiktok"
            type="url"
            spellCheck={false}
            autoComplete="off"
            maxLength={255}
            defaultValue={tiktok ?? ""}
            placeholder="TikTok"
            aria-label="TikTok"
          />
          <Input
            name="facebook"
            type="url"
            spellCheck={false}
            autoComplete="off"
            maxLength={255}
            defaultValue={facebook ?? ""}
            placeholder="Facebook"
            aria-label="Facebook"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Stačí vložit adresu profilu – https:// doplníme za vás.
        </p>
      </div>

      <SaveRow pending={pending} state={state} label="Uložit profil" />
    </form>
  );
}
