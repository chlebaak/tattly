"use client";

import { useRef, useState } from "react";
import { CameraIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsOf } from "@/lib/utils";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const MAX_BYTES = 15 * 1024 * 1024;

export function AvatarUploader({
  name,
  value,
  onChange,
  displayName,
}: {
  name: string;
  value: string;
  onChange: (url: string) => void;
  displayName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Podporované formáty jsou JPG, PNG, WebP a HEIC.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Fotka může mít maximálně 15 MB.");
      return;
    }
    setUploading(true);
    try {
      const signResponse = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "avatar",
          files: [{ name: file.name, size: file.size, type: file.type }],
        }),
      });
      if (!signResponse.ok) {
        if (signResponse.status === 401) throw new Error("auth");
        if (signResponse.status === 429) throw new Error("limited");
        throw new Error("sign");
      }
      const { uploads } = (await signResponse.json()) as {
        uploads: { key: string; uploadUrl: string }[];
      };
      const upload = uploads[0];
      if (!upload) throw new Error("sign");
      const put = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("upload");
      onChange(`/api/files/${upload.key}`);
      toast.success("Fotka nahrána – nezapomeňte profil uložit.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "auth") {
        toast.error("Přihlaste se prosím znovu a zkuste to.");
      } else if (code === "limited") {
        toast.error("Zkuste to prosím za chvíli.");
      } else {
        toast.error("Nahrání fotky se nezdařilo. Zkuste to znovu.");
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name={name} value={value} />
      <Avatar className="size-16 border">
        {value && <AvatarImage src={value} alt={displayName} />}
        <AvatarFallback className="text-lg font-semibold">
          {initialsOf(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <CameraIcon data-icon="inline-start" />
            )}
            {uploading ? "Nahrávám…" : "Nahrát fotku"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => onChange("")}
            >
              <Trash2Icon data-icon="inline-start" />
              Odebrat
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG nebo WebP, do 15 MB. Ideálně na výšku, alespoň 400×400 px.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          aria-label="Nahrát profilovou fotku"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
