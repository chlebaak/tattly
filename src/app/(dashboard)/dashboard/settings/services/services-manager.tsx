"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayersIcon } from "lucide-react";
import type { CustomFormField } from "@/db/schema";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveService, setServiceActive } from "./actions";
import { formatCents } from "@/lib/utils";

type ServiceRow = {
  id: string;
  title: string;
  durationMinutes: number;
  slotIntervalMinutes: number | null;
  priceMinor: number | null;
  depositMinor: number | null;
  isActive: boolean;
  customFormFields: CustomFormField[];
};

type FieldDraft = {
  id: string;
  label: string;
  type: CustomFormField["type"];
  required: boolean;
  optionsText: string;
};

const FIELD_TYPE_LABELS: Record<CustomFormField["type"], string> = {
  text: "Krátký text",
  number: "Číslo",
  textarea: "Dlouhý text",
  select: "Výběr z možností",
};

function parseOptions(optionsText: string): string[] {
  return optionsText
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function ServiceForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: ServiceRow;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [duration, setDuration] = useState(
    String(initial?.durationMinutes ?? 60)
  );
  const [slotInterval, setSlotInterval] = useState(
    initial?.slotIntervalMinutes ? String(initial.slotIntervalMinutes) : ""
  );
  const [priceCzk, setPriceCzk] = useState(
    initial?.priceMinor ? String(Math.round(initial.priceMinor / 100)) : ""
  );
  const [depositCzk, setDepositCzk] = useState(
    initial?.depositMinor !== null && initial?.depositMinor !== undefined
      ? String(Math.round(initial.depositMinor / 100))
      : ""
  );
  const [fields, setFields] = useState<FieldDraft[]>(
    (initial?.customFormFields ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      required: Boolean(f.required),
      optionsText: (f.options ?? []).join(", "),
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSave() {
    setError(null);
    if (title.trim().length < 2) {
      setError("Titul musí mít alespoň 2 znaky.");
      return;
    }
    const durationMinutes = Number(duration);
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 720
    ) {
      setError("Délka musí být 5–720 minut.");
      return;
    }
    for (const f of fields) {
      if (!f.label.trim()) {
        setError("Každé pole musí mít popisek.");
        return;
      }
      if (f.type === "select" && parseOptions(f.optionsText).length === 0) {
        setError(`Pole „${f.label}“ musí mít alespoň jednu možnost.`);
        return;
      }
    }
    const intervalMinutes = slotInterval ? Number(slotInterval) : undefined;
    if (
      intervalMinutes !== undefined &&
      (!Number.isInteger(intervalMinutes) ||
        intervalMinutes < 5 ||
        intervalMinutes > 720)
    ) {
      setError("Interval slotů musí být 5–720 minut.");
      return;
    }
    const price = priceCzk ? Number(priceCzk) : undefined;
    if (
      price !== undefined &&
      (!Number.isInteger(price) || price < 0 || price > 10_000_000)
    ) {
      setError("Cena musí být nezáporné číslo.");
      return;
    }
    const deposit = depositCzk !== "" ? Number(depositCzk) : undefined;
    if (
      deposit !== undefined &&
      (!Number.isInteger(deposit) || deposit < 0 || deposit > 1_000_000)
    ) {
      setError("Záloha musí být nezáporné číslo (0 = bez zálohy).");
      return;
    }
    setPending(true);
    const result = await saveService({
      id: initial?.id,
      title: title.trim(),
      durationMinutes,
      slotIntervalMinutes: slotInterval ? Number(slotInterval) : undefined,
      priceCzk: price,
      depositCzk: deposit,
      customFormFields: fields.map((f) => ({
        id: f.id,
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        options:
          f.type === "select" ? parseOptions(f.optionsText) : undefined,
      })),
    });
    setPending(false);
    if (!result.ok) {
      setError(
        result.error === "INVALID_INPUT"
          ? "Zkontrolujte zadané údaje."
          : "Uložení se nezdařilo."
      );
      return;
    }
    router.refresh();
    onSaved();
  }

  function updateField(id: string, patch: Partial<FieldDraft>) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`svc-title-${initial?.id ?? "new"}`}>Titul</Label>
          <Input
            id={`svc-title-${initial?.id ?? "new"}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Celodenní sezení"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`svc-duration-${initial?.id ?? "new"}`}>
            Délka (min)
          </Label>
          <Input
            id={`svc-duration-${initial?.id ?? "new"}`}
            type="number"
            min={5}
            max={720}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`svc-interval-${initial?.id ?? "new"}`}>
            Interval slotů (min)
          </Label>
          <Input
            id={`svc-interval-${initial?.id ?? "new"}`}
            type="number"
            min={5}
            max={720}
            value={slotInterval}
            onChange={(e) => setSlotInterval(e.target.value)}
            placeholder={`=${duration}`}
          />
          <p className="text-xs text-muted-foreground">
            Prázdné = hustota podle délky služby
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`svc-price-${initial?.id ?? "new"}`}>
            Cena (Kč)
          </Label>
          <Input
            id={`svc-price-${initial?.id ?? "new"}`}
            type="number"
            min={0}
            step={100}
            value={priceCzk}
            onChange={(e) => setPriceCzk(e.target.value)}
            placeholder="Dle domluvy"
          />
          <p className="text-xs text-muted-foreground">
            Prázdné = cena dle domluvy (na faktuře se neobjeví)
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`svc-deposit-${initial?.id ?? "new"}`}>
            Záloha (Kč)
          </Label>
          <Input
            id={`svc-deposit-${initial?.id ?? "new"}`}
            type="number"
            min={0}
            step={50}
            value={depositCzk}
            onChange={(e) => setDepositCzk(e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            0 = bez zálohy, termín se potvrdí okamžitě
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Screeningová pole</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFields((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  type: "text",
                  required: false,
                  optionsText: "",
                },
              ])
            }
          >
            Přidat pole
          </Button>
        </div>
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Žádná doplňující pole – formulář obsahuje jen jméno, kontakt a
            popis motivu.
          </p>
        )}
        <div className="space-y-3">
          {fields.map((f, index) => (
            <div key={f.id} className="space-y-3 rounded-xl bg-muted/30 p-3">
              <div className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_auto]">
                <div className="space-y-1">
                  <Label htmlFor={`f-label-${initial?.id ?? "new"}-${index}`}>
                    Popisek
                  </Label>
                  <Input
                    id={`f-label-${initial?.id ?? "new"}-${index}`}
                    value={f.label}
                    onChange={(e) => updateField(f.id, { label: e.target.value })}
                    placeholder="Rozměry motivu (cm)"
                    maxLength={120}
                  />
                </div>
                <Select
                  value={f.type}
                  onValueChange={(v) =>
                    updateField(f.id, { type: v as FieldDraft["type"] })
                  }
                >
                  <SelectTrigger aria-label="Typ pole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Odebrat pole"
                  onClick={() =>
                    setFields((prev) => prev.filter((x) => x.id !== f.id))
                  }
                >
                  ×
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`f-req-${initial?.id ?? "new"}-${index}`}
                    checked={f.required}
                    onCheckedChange={(v) =>
                      updateField(f.id, { required: v === true })
                    }
                  />
                  <Label htmlFor={`f-req-${initial?.id ?? "new"}-${index}`}>
                    Povinné
                  </Label>
                </div>
                {f.type === "select" && (
                  <Input
                    value={f.optionsText}
                    onChange={(e) =>
                      updateField(f.id, { optionsText: e.target.value })
                    }
                    placeholder="Možnosti oddělené čárkou"
                    className="flex-1"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Ukládám…" : "Uložit"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Zrušit
        </Button>
      </div>
    </div>
  );
}

export function ServicesManager({ services }: { services: ServiceRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  async function toggleActive(service: ServiceRow) {
    setBusyId(service.id);
    await setServiceActive({ serviceId: service.id, isActive: !service.isActive });
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {creating ? (
        <Panel className="p-5">
          <ServiceForm
            onSaved={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </Panel>
      ) : (
        <Button type="button" onClick={() => setCreating(true)}>
          Přidat službu
        </Button>
      )}
      <div className="space-y-3">
        {services.map((s) => (
          <Panel key={s.id} className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="font-medium">{s.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.durationMinutes} min
                  {s.priceMinor
                    ? ` · ${formatCents(s.priceMinor)}`
                    : " · cena dle domluvy"}
                  {s.depositMinor && s.depositMinor > 0
                    ? ` · záloha ${formatCents(s.depositMinor)}`
                    : " · bez zálohy"}
                </p>
                {s.customFormFields.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pole: {s.customFormFields.map((f) => f.label).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={s.isActive ? "secondary" : "outline"}>
                  {s.isActive ? "Aktivní" : "Neaktivní"}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingId(editingId === s.id ? null : s.id)
                  }
                >
                  {editingId === s.id ? "Zavřít" : "Upravit"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busyId === s.id}
                  onClick={() => toggleActive(s)}
                >
                  {s.isActive ? "Deaktivovat" : "Aktivovat"}
                </Button>
              </div>
            </div>
            {editingId === s.id && (
              <div className="border-t border-foreground/8 p-5">
                <ServiceForm
                  initial={s}
                  onSaved={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}
          </Panel>
        ))}
        {services.length === 0 && !creating && (
          <EmptyState
            icon={LayersIcon}
            title="Zatím žádné služby"
            description="Přidejte první službu, aby mohli klienti posílat poptávky."
            action={
              <Button type="button" size="sm" onClick={() => setCreating(true)}>
                Přidat službu
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
