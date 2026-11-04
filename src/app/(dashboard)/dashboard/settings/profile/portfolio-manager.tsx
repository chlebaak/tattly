"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ImagePlusIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { plural } from "@/lib/utils";
import { savePortfolioImages } from "../actions";

const MAX_IMAGES = 12;
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
/** Server podepisuje maximálně 4 soubory na jeden požadavek. */
const SIGN_BATCH = 4;

type PortfolioImage = { key: string; alt?: string };

function uploadErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  if (code === "auth") return "Přihlaste se prosím znovu a zkuste to.";
  if (code === "limited") return "Zkuste to prosím za chvíli.";
  return "Nahrání fotek se nezdařilo. Zkuste to znovu.";
}

export function PortfolioManager({
  images,
}: {
  images: PortfolioImage[];
}) {
  const [items, setItems] = useState<PortfolioImage[]>(images);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function persist(next: PortfolioImage[], message = "Portfolio uloženo.") {
    const previous = items;
    setItems(next);
    setBusy(true);
    const result = await savePortfolioImages({ images: next });
    setBusy(false);
    if (!result.ok) {
      setItems(previous);
      toast.error("Uložení portfolia se nezdařilo.");
      return;
    }
    toast.success(message);
    router.refresh();
  }

  async function addFiles(fileList: FileList) {
    const files = Array.from(fileList);
    if (!files.length) return;

    const room = MAX_IMAGES - items.length;
    if (room <= 0) {
      toast.error(`Vejde se maximálně ${MAX_IMAGES} fotek.`);
      return;
    }
    const selected = files.slice(0, room);
    if (files.length > room) {
      toast.info(`Do portfolia se vejde maximálně ${MAX_IMAGES} fotek.`);
    }
    const invalid = selected.find(
      (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES
    );
    if (invalid) {
      toast.error("Podporované jsou JPG, PNG, WebP a HEIC do 15 MB.");
      return;
    }

    setUploading(true);
    setProgress({ done: 0, total: selected.length });
    const added: PortfolioImage[] = [];
    let failed = 0;
    try {
      // Podepisujeme po dávkách (server jich vezme nejvýše 4), ale nahráváme
      // paralelně v rámci dávky – u velkého výběru to zvládne i mobil.
      for (let start = 0; start < selected.length; start += SIGN_BATCH) {
        const batch = selected.slice(start, start + SIGN_BATCH);
        const signResponse = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: "portfolio",
            files: batch.map((file) => ({
              name: file.name,
              size: file.size,
              type: file.type,
            })),
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
        const settled = await Promise.allSettled(
          uploads.map(async (upload, index) => {
            const response = await fetch(upload.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": batch[index]!.type },
              body: batch[index] as Blob,
            });
            if (!response.ok) throw new Error("upload");
            return upload.key;
          })
        );
        for (const result of settled) {
          if (result.status === "fulfilled") added.push({ key: result.value });
          else failed += 1;
        }
        setProgress({ done: added.length + failed, total: selected.length });
      }
    } catch (error) {
      toast.error(uploadErrorMessage(error));
    }

    if (added.length) {
      await persist(
        [...items, ...added],
        added.length === 1
          ? failed
            ? "Fotka nahrána, jedna se nezdařila."
            : "Fotka přidána do portfolia."
          : failed
            ? `Nahrány ${added.length} ${plural(added.length, "fotka", "fotky", "fotek")}, ${failed} ${plural(failed, "se nezdařila", "se nezdařily", "se nezdařilo")}.`
            : `Nahrány ${added.length} ${plural(added.length, "fotka", "fotky", "fotek")}.`
      );
    } else if (failed) {
      toast.error("Nahrání fotek se nezdařilo. Zkuste to znovu.");
    }

    setUploading(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    void persist(next, "Pořadí upraveno.");
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((image, index) => (
            <li
              key={image.key}
              className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-foreground/8"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${image.key}`}
                alt={image.alt ?? `Portfolio ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
              <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <span className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Posunout doleva"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                    className="flex size-7 items-center justify-center rounded-lg bg-background/90 text-foreground transition-colors hover:bg-background disabled:opacity-40"
                  >
                    <ArrowLeftIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Posunout doprava"
                    disabled={busy || index === items.length - 1}
                    onClick={() => move(index, 1)}
                    className="flex size-7 items-center justify-center rounded-lg bg-background/90 text-foreground transition-colors hover:bg-background disabled:opacity-40"
                  >
                    <ArrowRightIcon className="size-3.5" />
                  </button>
                </span>
                <button
                  type="button"
                  aria-label="Odebrat fotku"
                  disabled={busy}
                  onClick={() =>
                    void persist(
                      items.filter((item) => item.key !== image.key),
                      "Fotka odebrána."
                    )
                  }
                  className="flex size-7 items-center justify-center rounded-lg bg-background/90 text-destructive transition-colors hover:bg-background disabled:opacity-40"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={uploading || busy || items.length >= MAX_IMAGES}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-foreground/15 px-4 py-6 text-center transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
          items.length >= MAX_IMAGES && "cursor-not-allowed"
        )}
      >
        {uploading ? (
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <ImagePlusIcon className="size-5 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          {uploading
            ? progress
              ? `Nahrávám ${progress.done}/${progress.total}…`
              : "Nahrávám…"
            : items.length === 0
              ? "Přidat fotky práce"
              : "Přidat další fotky"}
        </span>
        <span className="text-xs text-muted-foreground">
          {items.length}/{MAX_IMAGES} fotek · JPG, PNG nebo WebP do 15 MB
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        aria-label="Přidat fotky do portfolia"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files);
        }}
      />
    </div>
  );
}
