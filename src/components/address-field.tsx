"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

export type AddressValue = {
  addressLine: string;
  city: string;
  zip: string;
  lat: number | null;
  lng: number | null;
};

type Suggestion = {
  label: string;
  addressLine: string;
  city: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
};

type Props = {
  id?: string;
  value: string;
  onChange: (value: AddressValue) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function AddressField({
  id,
  value,
  onChange,
  placeholder = "Začni psát adresu…",
  disabled = false,
}: Props) {
  const [query, setQuery] = useState(value);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  function onInput(next: string) {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/geocode/suggest?mode=address&q=${encodeURIComponent(next.trim())}`
        );
        const data = (await res.json()) as { items?: Suggestion[] };
        setItems(data.items ?? []);
        setOpen((data.items ?? []).length > 0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  return (
    <Popover
      open={open && items.length > 0}
      onOpenChange={(o) => {
        if (!o) setOpen(false);
      }}
    >
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            id={id}
            value={query}
            onChange={(e) => onInput(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className="pr-9"
          />
          <MapPinIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          {loading && (
            <p className="absolute -bottom-4 left-1 text-xs text-muted-foreground">
              Hledám…
            </p>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-1"
        style={{ width: "var(--radix-popover-trigger-width, 22rem)" }}
      >
        <div className="flex flex-col">
          {items.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              type="button"
              onClick={() => {
                onChange({
                  addressLine: item.addressLine,
                  city: item.city ?? "",
                  zip: item.zip ?? "",
                  lat: item.lat,
                  lng: item.lng,
                });
                setQuery(item.addressLine);
                setOpen(false);
              }}
              className="flex items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="block">{item.addressLine}</span>
                {item.label !== item.addressLine && (
                  <span className="block text-xs text-muted-foreground">
                    {item.label}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
