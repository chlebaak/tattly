"use client";

import { useActionState, useState } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { updateSlug, type ProfileActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveRow } from "../form-status";

export function SlugForm({
  slug,
  publicUrl,
}: {
  slug: string;
  publicUrl: string;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updateSlug, null);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => {
        setCopied(true);
        toast.success("Odkaz na profil zkopírován");
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Kopírování se nezdařilo"));
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="slug">Adresa veřejného profilu</Label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">/artist/</span>
          <Input
            id="slug"
            name="slug"
            defaultValue={slug}
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
            pattern="[a-zA-Z0-9-]+"
            className="max-w-64"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Písmena, čísla a pomlčky. Po změně přestane platit starý odkaz –
          nezapomeňte nový vložit do Instagram bio.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm">{publicUrl}</span>
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <CopyIcon data-icon="inline-start" />
          )}
          {copied ? "Zkopírováno" : "Kopírovat"}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <ExternalLinkIcon data-icon="inline-start" />
            Otevřít
          </a>
        </Button>
      </div>

      <SaveRow pending={pending} state={state} label="Změnit adresu" />
    </form>
  );
}
