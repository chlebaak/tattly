"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export function PortfolioGallery({
  images,
  name,
}: {
  images: { key: string; alt?: string }[];
  name: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const current = index !== null ? images[index] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((image, position) => (
          <li key={image.key}>
            <button
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`Zvětšit fotku ${position + 1}`}
              className="group block aspect-square w-full overflow-hidden rounded-xl ring-1 ring-foreground/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${image.key}`}
                alt={image.alt ?? `Práce – ${name}`}
                width={1200}
                height={1200}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-300 ease-brand group-hover:scale-[1.03] motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={index !== null}
        onOpenChange={(open) => {
          if (!open) setIndex(null);
        }}
      >
        <DialogContent className="max-w-3xl p-2 sm:p-3">
          <DialogTitle className="sr-only">
            Fotka z portfolia {name}
          </DialogTitle>
          {current && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${current.key}`}
              alt={current.alt ?? `Práce – ${name}`}
              width={1200}
              height={1200}
              className="max-h-[75svh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
