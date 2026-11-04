"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StylesInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [items, setItems] = useState<string[]>(
    defaultValue
      ? defaultValue
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : []
  );
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    setItems((prev) =>
      prev.some((item) => item.toLowerCase() === value.toLowerCase())
        ? prev
        : [...prev, value]
    );
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={items.join(", ")} />
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pr-1.5 pl-2.5 text-xs font-medium"
            >
              {item}
              <button
                type="button"
                aria-label={`Odebrat ${item}`}
                onClick={() =>
                  setItems((prev) => prev.filter((value) => value !== item))
                }
                className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="např. realismus, fineline, dotwork"
          aria-label="Přidat specializaci"
        />
        <Button type="button" variant="outline" onClick={add}>
          <PlusIcon data-icon="inline-start" />
          Přidat
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter nebo „Přidat“ – na veřejném profilu se zobrazí jako štítky.
      </p>
    </div>
  );
}
