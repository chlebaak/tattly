"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

type Props = {
  value: string;
  onChange: (city: string) => void;
  id?: string;
  placeholder?: string;
};

export function CityFilter({ value, onChange, id, placeholder }: Props) {
  const [query, setQuery] = useState(value);
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  function onInput(next: string) {
    setQuery(next);
    onChange(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (next.trim().length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode/suggest?mode=city&q=${encodeURIComponent(next.trim())}`
        );
        const data = (await res.json()) as { items?: { city: string }[] };
        const unique = Array.from(
          new Set((data.items ?? []).map((i) => i.city))
        );
        setItems(unique);
        setOpen(unique.length > 0);
      } catch {
        setItems([]);
        setOpen(false);
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
            placeholder={placeholder ?? "Město (např. Praha)"}
            autoComplete="off"
            className="pr-9"
          />
          <SearchIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-1"
        style={{ width: "var(--radix-popover-trigger-width, 20rem)" }}
      >
        <div className="flex flex-col">
          {items.map((city, index) => (
            <button
              key={`${city}-${index}`}
              type="button"
              onClick={() => {
                setQuery(city);
                onChange(city);
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
              {city}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
