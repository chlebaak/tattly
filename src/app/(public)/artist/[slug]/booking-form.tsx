"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  CalendarOffIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomFormField } from "@/db/schema";
import { formatCents } from "@/lib/utils";
import { createBookingRequest, getAvailableSlots } from "./actions";

type ServiceOption = {
  id: string;
  title: string;
  durationMinutes: number;
  priceMinor: number | null;
  depositMinor: number | null;
  customFormFields: CustomFormField[];
};

type Props = {
  slug: string;
  services: ServiceOption[];
  defaultDepositLabel: string;
};

type Slot = { startIso: string; endIso: string };

const STEPS = ["Služba", "Termín", "Detaily", "Shrnutí"] as const;

const MAX_FILES = 4;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const timeFormatter = new Intl.DateTimeFormat("cs-CZ", {
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("cs-CZ", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function slotGroup(date: Date): "Dopoledne" | "Odpoledne" | "Večer" {
  const h = date.getHours();
  if (h < 12) return "Dopoledne";
  if (h < 17) return "Odpoledne";
  return "Večer";
}

type SlotGroup = "Dopoledne" | "Odpoledne" | "Večer";

const GROUP_ORDER: SlotGroup[] = ["Dopoledne", "Odpoledne", "Večer"];

export function BookingForm({ slug, services, defaultDepositLabel }: Props) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [hasSchedule, setHasSchedule] = useState<boolean | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedStartIso, setSelectedStartIso] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const service = services.find((s) => s.id === serviceId);

  const dirty =
    !done &&
    Boolean(
      clientName ||
        clientEmail ||
        clientPhone ||
        description ||
        files.length ||
        selectedStartIso ||
        Object.keys(custom).length
    );

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setLoadingSlots(true);
    getAvailableSlots({
      slug,
      serviceId,
      fromIso: new Date().toISOString(),
      days: 60,
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setSlots(res.slots);
          setHasSchedule(res.hasSchedule);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, serviceId]);

  const slotsByDay = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const slot of slots) {
      const key = localDayKey(new Date(slot.startIso));
      (map[key] ??= []).push(slot);
    }
    return map;
  }, [slots]);

  const firstSlot = slots[0] ?? null;

  const daySlots = useMemo(
    () => (selectedDay ? (slotsByDay[selectedDay] ?? []) : []),
    [slotsByDay, selectedDay]
  );

  function selectDay(day: string) {
    setSelectedDay(day);
    const daySlot = (slotsByDay[day] ?? [])[0];
    setSelectedStartIso(daySlot?.startIso ?? "");
  }

  function addFiles(selected: File[]) {
    const tooMany = selected.length > MAX_FILES;
    const tooBig = selected.some((f) => f.size > MAX_FILE_BYTES);
    if (tooMany || tooBig) {
      toast.error(
        tooMany
          ? "Nahrát lze nejvýše 4 soubory."
          : "Každý soubor může mít maximálně 15 MB."
      );
      return;
    }
    setFiles(selected);
    const map: Record<string, string> = {};
    for (const f of selected) map[f.name + f.size] = URL.createObjectURL(f);
    setPreviews(map);
  }

  function removeOne(file: File) {
    const key = file.name + file.size;
    const url = previews[key];
    if (url) URL.revokeObjectURL(url);
    setPreviews((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFiles((prev) => prev.filter((f) => f !== file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadFiles(selected: File[]): Promise<string[]> {
    if (!selected.length) return [];
    const signRes = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: selected.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
      }),
    });
    if (!signRes.ok) throw new Error("SIGN_FAILED");
    const { uploads } = (await signRes.json()) as {
      uploads: { key: string; uploadUrl: string }[];
    };
    await Promise.all(
      uploads.map((u, i) =>
        fetch(u.uploadUrl, {
          method: "PUT",
          body: selected[i] as Blob,
          headers: { "Content-Type": selected[i]!.type },
        })
      )
    );
    return uploads.map((u) => u.key);
  }

  function canContinue(target: number): boolean {
    if (target === 2) return Boolean(serviceId);
    if (target === 3) return Boolean(selectedStartIso);
    if (target === 4) {
      return (
        clientName.trim().length >= 2 &&
        clientEmail.includes("@") &&
        consent
      );
    }
    return true;
  }

  function goTo(next: number) {
    if (next > step && !canContinue(next)) {
      if (next === 3) {
        setError("Vyberte prosím termín.");
      } else if (next === 4) {
        setError("Vyplňte jméno, platný e-mail a potvrďte souhlas.");
      }
      return;
    }
    setDirection(next >= step ? 1 : -1);
    setError(null);
    setStep(Math.min(4, Math.max(1, next)));
  }

  async function onSubmit() {
    const startIso = selectedStartIso;
    if (!consent) {
      setError("Potvrďte prosím souhlas se zpracováním osobních údajů.");
      setStep(3);
      return;
    }
    if (!serviceId || !startIso || clientName.trim().length < 2 || !clientEmail) {
      setError("Zkontrolujte prosím vyplněné údaje.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const assetKeys = await uploadFiles(files);
      const result = await createBookingRequest({
        slug,
        serviceId,
        clientName: clientName.trim(),
        clientEmail,
        clientPhone: clientPhone.trim() || undefined,
        description: description.trim() || undefined,
        startIso,
        formData: custom,
        assetKeys,
      });
      if (!result.ok) {
        if (result.error === "SLOT_TAKEN") {
          toast.error(
            "Termín je už obsazený – vyberte prosím jiný slot a odešlete znovu."
          );
          setStep(2);
        } else if (result.error === "NO_AVAILABILITY") {
          toast.error(
            "Profesionál zatím nemá otevřené termíny – poptávku nelze odeslat."
          );
          setStep(2);
        } else {
          toast.error("Odeslání se nezdařilo. Zkuste to prosím znovu.");
        }
        return;
      }
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error("Odeslání se nezdařilo. Zkuste to prosím znovu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="animate-pop flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckIcon className="size-7" />
          </span>
          <p className="text-lg font-semibold">Poptávka odeslána</p>
          <p className="max-w-md text-sm text-muted-foreground text-pretty">
            {service?.title ?? "Poptávka"} čeká na posouzení.{" "}
            {service?.depositMinor && service.depositMinor > 0
              ? `Až termín schválí, přijde vám e-mail s odkazem na úhradu zálohy ${formatCents(service.depositMinor)}. Termín se zablokuje až po její úhradě.`
              : "Až termín schválí, přijde vám e-mail s potvrzením."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedSlotDate = selectedStartIso ? new Date(selectedStartIso) : null;

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2">
        {STEPS.map((title, index) => {
          const number = index + 1;
          const active = step === number;
          const passed = step > number;
          return (
            <li key={title} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(number)}
                className="flex items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  className={
                    passed
                      ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                      : active
                        ? "flex size-7 shrink-0 items-center justify-center rounded-full border border-primary text-xs font-semibold text-primary"
                        : "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground"
                  }
                >
                  {passed ? <CheckIcon className="size-3.5" /> : number}
                </span>
                <span
                  className={
                    active
                      ? "hidden text-xs font-bold uppercase tracking-wider sm:block"
                      : "hidden text-xs text-muted-foreground uppercase tracking-wider sm:block"
                  }
                >
                  {title}
                </span>
              </button>
              {number < STEPS.length && (
                <span className="h-px flex-1 bg-border" />
              )}
            </li>
          );
        })}
      </ol>

      <div
        key={step}
        className={cn(
          "animate-in fade-in-0 duration-500 ease-brand motion-reduce:animate-none",
          direction === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6"
        )}
      >
        {step === 1 && (
        <div className="space-y-3">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceId(s.id)}
              className={
                serviceId === s.id
                  ? "flex w-full items-center justify-between rounded-xl border border-primary bg-primary/8 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  : "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              }
            >
              <span>
                <span className="block font-medium">{s.title}</span>
                <span className="block text-sm text-muted-foreground">
                  {s.durationMinutes} min
                  {s.priceMinor ? ` · ${formatCents(s.priceMinor)}` : ""}
                  {s.depositMinor && s.depositMinor > 0
                    ? ` · záloha ${formatCents(s.depositMinor)}`
                    : s.depositMinor === 0
                      ? " · bez zálohy"
                      : ""}
                </span>
              </span>
              {serviceId === s.id && (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon className="size-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {loadingSlots || hasSchedule === null ? (
            <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
              <Skeleton className="h-72 w-full rounded-xl sm:w-72" />
              <div className="space-y-3">
                <Skeleton className="h-8 w-40 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            </div>
          ) : hasSchedule ? (
            <div className="space-y-4">
              {slots.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  V následujících 2 měsících není žádný volný slot – zkuste to
                  později.
                </p>
              )}
              <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
              <div className="rounded-xl border p-3">
                <Calendar
                  mode="single"
                  selected={selectedSlotDate ?? undefined}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  onSelect={(d) => d && selectDay(localDayKey(d))}
                  disabled={(d) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (d < today) return true;
                    return !slotsByDay[localDayKey(d)];
                  }}
                  startMonth={new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
                  endMonth={(() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + 3);
                    return new Date(d.getFullYear(), d.getMonth(), 1);
                  })()}
                />
              </div>
              <div className="space-y-3">
                {selectedDay && daySlots.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {dayFormatter.format(new Date(selectedStartIso))}
                  </p>
                )}
                {selectedDay && daySlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    V tento den nejsou volné sloty – vyberte jiný den.
                  </p>
                ) : (
                  GROUP_ORDER.map((group) => {
                    const groupSlots = daySlots.filter(
                      (s) => slotGroup(new Date(s.startIso)) === group
                    );
                    if (!groupSlots.length) return null;
                    return (
                      <div key={group} className="space-y-2">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {group}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {groupSlots.map((s) => (
                            <Button
                              key={s.startIso}
                              type="button"
                              size="sm"
                              variant={
                                selectedStartIso === s.startIso
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => setSelectedStartIso(s.startIso)}
                            >
                              {timeFormatter.format(new Date(s.startIso))}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
                {selectedDay === "" && firstSlot && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date(firstSlot.startIso);
                      setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      selectDay(localDayKey(d));
                    }}
                  >
                    <CalendarDaysIcon data-icon="inline-start" />
                    Nejbližší volno:{" "}
                    {dayFormatter.format(new Date(firstSlot.startIso))},{" "}
                    {timeFormatter.format(new Date(firstSlot.startIso))}
                  </Button>
                )}
              </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
              <CalendarOffIcon className="size-6 text-muted-foreground" />
              <p className="font-medium">Profesionál zatím nemá otevřené termíny</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Jakmile si nastaví dostupnost, objeví se zde volné sloty ke
                výběru.
              </p>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Jméno</Label>
              <Input
                id="clientName"
                name="name"
                autoComplete="name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Telefon</Label>
              <Input
                id="clientPhone"
                type="tel"
                autoComplete="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                maxLength={32}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">E-mail</Label>
            <Input
              id="clientEmail"
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              required
            />
          </div>

          {service?.customFormFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`field-${field.id}`}
                  required={field.required}
                  value={custom[field.id] ?? ""}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, [field.id]: e.target.value }))
                  }
                />
              ) : field.type === "select" ? (
                <Select
                  value={custom[field.id] ?? ""}
                  onValueChange={(v) =>
                    setCustom((c) => ({ ...c, [field.id]: v }))
                  }
                >
                  <SelectTrigger id={`field-${field.id}`} className="w-full">
                    <SelectValue placeholder="Vyberte" />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`field-${field.id}`}
                  type={field.type === "number" ? "number" : "text"}
                  required={field.required}
                  value={custom[field.id] ?? ""}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, [field.id]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="description">Popis motivu / cíle</Label>
            <Textarea
              id="description"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Referenční fotky (max.&nbsp;4)</Label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(Array.from(e.dataTransfer.files ?? []));
              }}
              className={
                dragging
                  ? "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-primary bg-primary/8 px-4 py-8 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  : "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              }
            >
              <UploadIcon className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">
                Přetáhněte fotky sem nebo klikněte
              </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP nebo HEIC, do 15&nbsp;MB na soubor.
        </p>
              <input
                ref={fileInputRef}
                id="assets"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
              />
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {files.map((f) => {
                  const preview = previews[f.name + f.size];
                  return (
                    <div
                      key={f.name + f.size}
                      className="group relative size-20 overflow-hidden rounded-lg ring-1 ring-foreground/10"
                    >
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt={f.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center">
                          <ImageIcon className="size-5 text-muted-foreground" />
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={`Odebrat ${f.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOne(f);
                        }}
                        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <Label
              htmlFor="consent"
              className="text-xs leading-relaxed font-normal text-muted-foreground"
            >
              Souhlasím se{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="underline underline-offset-2"
              >
                zpracováním osobních údajů
              </Link>{" "}
              za účelem vyřízení rezervace, včetně referenčních fotek
              a odpovědí v dotazníku.
            </Label>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Služba</span>
              <span className="font-medium">{service?.title}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Termín</span>
              <span className="text-right font-medium">
                {selectedSlotDate
                  ? `${dayFormatter.format(selectedSlotDate)}, ${timeFormatter.format(selectedSlotDate)}`
                  : "—"}
              </span>
            </div>
            {service?.priceMinor ? (
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Cena</span>
                <span className="font-medium">
                  {formatCents(service.priceMinor)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Záloha</span>
              <span className="font-medium">
                {service?.depositMinor && service.depositMinor > 0
                  ? formatCents(service.depositMinor)
                  : service?.depositMinor === 0
                    ? "bez zálohy – termín potvrdíme rovnou"
                    : defaultDepositLabel}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Kontakt</span>
              <span className="text-right font-medium">
                {clientName}
                <br />
                {clientEmail}
                {clientPhone ? ` · ${clientPhone}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Fotky</span>
              <span className="font-medium">
                {files.length} / {MAX_FILES}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Poptávku posoudí profesionál – termín se zablokuje až po uhrazení
            zálohy.
          </p>
        </div>
      )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => goTo(step - 1)}
          disabled={step === 1 || submitting}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          Zpět
        </Button>
        {step < 4 ? (
          <Button type="button" onClick={() => goTo(step + 1)} disabled={submitting}>
            Pokračovat
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        ) : (
          <Button type="button" onClick={onSubmit} disabled={submitting}>
            {submitting
              ? files.length > 0
                ? "Nahrávám fotky…"
                : "Odesílám…"
              : "Odeslat poptávku"}
          </Button>
        )}
      </div>
    </div>
  );
}
