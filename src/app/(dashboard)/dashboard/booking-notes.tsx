"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { saveBookingNotes } from "./actions";

export function BookingNotes({
  bookingId,
  initialNotes,
}: {
  bookingId: string;
  initialNotes: string | null;
}) {
  const [value, setValue] = useState(initialNotes ?? "");
  const [lastSaved, setLastSaved] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = value !== lastSaved;

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    const result = await saveBookingNotes({ bookingId, notes: value });
    setSaving(false);
    if (!result.ok) {
      toast.error("Poznámku se nepodařilo uložit.");
      return;
    }
    setLastSaved(value);
    toast.success("Poznámka uložena.");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Interní poznámka
        </p>
        <span className="text-[11px] text-muted-foreground">
          {saving ? "Ukládám…" : dirty ? "Neuloženo" : "Uloženo"}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void save();
          }
        }}
        placeholder="Nápady na motiv, odhad ceny, poznámky ze schválení…"
        rows={3}
      />
      <p className="text-[11px] text-muted-foreground">
        Vidíte jen vy. Ukládá se při opuštění pole.
      </p>
    </div>
  );
}
