"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  CalendarOffIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  Loader2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
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
import { formatCents, plural } from "@/lib/utils";
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
  /** Časové pásmo tatéra – klientovi ukážeme, když má jiné než on. */
  artistTimezone: string;
};

type Slot = { startIso: string; endIso: string };

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => (
      <div className="h-[19rem] w-full animate-pulse rounded-lg bg-muted/60" />
    ),
  }
);

const STEPS = ["Služba", "Termín", "Detaily", "Shrnutí"] as const;

const MAX_FILES = 4;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

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

const stripFormatter = new Intl.DateTimeFormat("cs-CZ", {
  weekday: "short",
  day: "numeric",
  month: "numeric",
});

function slotGroup(date: Date): "Dopoledne" | "Odpoledne" | "Večer" {
  const hours = date.getHours();
  if (hours < 12) return "Dopoledne";
  if (hours < 17) return "Odpoledne";
  return "Večer";
}

type SlotGroup = "Dopoledne" | "Odpoledne" | "Večer";

const GROUP_ORDER: SlotGroup[] = ["Dopoledne", "Odpoledne", "Večer"];

type FieldErrors = {
  name?: string;
  email?: string;
  consent?: string;
  slot?: string;
  form?: string;
};

export function BookingForm({
  slug,
  services,
  defaultDepositLabel,
  artistTimezone,
}: Props) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [hasSchedule, setHasSchedule] = useState<boolean | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedStartIso, setSelectedStartIso] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [viewerTimezone, setViewerTimezone] = useState<string | null>(null);
  const [done, setDone] = useState<{ statusCode: string | null } | null>(null);
  useEffect(() => {
    setViewerTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const service = services.find((item) => item.id === serviceId);

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
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Uvolnění objektových URL při odchodu ze stránky
  useEffect(() => {
    return () => {
      for (const url of Object.values(previews)) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSlots = useMemo(
    () => async () => {
      if (!serviceId) return;
      setLoadingSlots(true);
      try {
        const response = await getAvailableSlots({
          slug,
          serviceId,
          fromIso: new Date().toISOString(),
          days: 60,
        });
        if (response.ok) {
          setSlots(response.slots);
          setHasSchedule(response.hasSchedule);
        }
      } catch {
        // tichý fail – klient může zkusit znovu
      } finally {
        setLoadingSlots(false);
      }
    },
    [slug, serviceId]
  );

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const slotsByDay = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const slot of slots) {
      const key = localDayKey(new Date(slot.startIso));
      (map[key] ??= []).push(slot);
    }
    return map;
  }, [slots]);

  const nextDays = useMemo(
    () => Object.keys(slotsByDay).sort().slice(0, 7),
    [slotsByDay]
  );

  const firstSlot = slots[0] ?? null;

  const daySlots = useMemo(
    () => (selectedDay ? (slotsByDay[selectedDay] ?? []) : []),
    [slotsByDay, selectedDay]
  );

  function selectDay(day: string) {
    setSelectedDay(day);
    const first = (slotsByDay[day] ?? [])[0];
    setSelectedStartIso(first?.startIso ?? "");
    setErrors((prev) => ({ ...prev, slot: undefined }));
  }

  function addFiles(selected: File[]) {
    if (!selected.length) return;
    const room = MAX_FILES - files.length;
    if (room <= 0) {
      toast.error(`Nahrát lze nejvýše ${MAX_FILES} fotky.`);
      return;
    }
    const next = selected.slice(0, room);
    const invalid = next.find(
      (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_BYTES
    );
    if (invalid) {
      toast.error("Podporované jsou JPG, PNG, WebP a HEIC do 15 MB.");
      return;
    }
    const nextPreviews = { ...previews };
    for (const file of next) {
      nextPreviews[file.name + file.size] = URL.createObjectURL(file);
    }
    setPreviews(nextPreviews);
    setFiles((prev) => [...prev, ...next]);
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
    setFiles((prev) => prev.filter((item) => item !== file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadFiles(selected: File[]): Promise<string[]> {
    if (!selected.length) return [];
    const signResponse = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "booking",
        files: selected.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      }),
    });
    if (!signResponse.ok) throw new Error("SIGN_FAILED");
    const { uploads } = (await signResponse.json()) as {
      uploads: { key: string; uploadUrl: string }[];
    };
    await Promise.all(
      uploads.map((upload, index) =>
        fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selected[index]!.type },
          body: selected[index] as Blob,
        }).then((response) => {
          if (!response.ok) throw new Error("UPLOAD_FAILED");
        })
      )
    );
    return uploads.map((upload) => upload.key);
  }

  function validateStep3(): FieldErrors {
    const next: FieldErrors = {};
    if (clientName.trim().length < 2) {
      next.name = "Vyplňte prosím jméno (alespoň 2 znaky).";
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail.trim())) {
      next.email = "Zadejte prosím platný e-mail.";
    }
    if (!consent) {
      next.consent = "Potvrďte prosím souhlas se zpracováním údajů.";
    }
    return next;
  }

  function goTo(next: number) {
    if (next > step) {
      if (step === 2 && !selectedStartIso) {
        setErrors({ slot: "Vyberte prosím termín." });
        return;
      }
      if (step === 3) {
        const found = validateStep3();
        if (Object.keys(found).length) {
          setErrors(found);
          return;
        }
      }
    }
    setDirection(next >= step ? 1 : -1);
    setErrors({});
    setStep(Math.min(4, Math.max(1, next)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 4) {
      goTo(step + 1);
      return;
    }
    if (!selectedStartIso) {
      setErrors({ slot: "Vyberte prosím termín." });
      setStep(2);
      return;
    }
    const found = validateStep3();
    if (Object.keys(found).length) {
      setErrors(found);
      setStep(3);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      let assetKeys: string[] = [];
      if (files.length) {
        setUploading(true);
        assetKeys = await uploadFiles(files);
        setUploading(false);
      }
      const result = await createBookingRequest({
        slug,
        serviceId,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim() || undefined,
        description: description.trim() || undefined,
        startIso: selectedStartIso,
        formData: custom,
        assetKeys,
      });
      if (!result.ok) {
        if (result.error === "SLOT_TAKEN") {
          toast.error("Termín si mezitím někdo vybral – vyberte prosím jiný.");
          setStep(2);
          setErrors({ slot: "Tento termín je už obsazený." });
          void loadSlots();
        } else if (result.error === "NO_AVAILABILITY") {
          toast.error("Tatér zatím nemá otevřené termíny.");
          setStep(2);
        } else {
          toast.error("Odeslání se nezdařilo. Zkuste to prosím znovu.");
        }
        return;
      }
      setDone({ statusCode: result.statusCode ?? null });
    } catch (error) {
      console.error(error);
      toast.error("Odeslání se nezdařilo. Zkuste to prosím znovu.");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  const selectedSlotDate = selectedStartIso
    ? new Date(selectedStartIso)
    : null;
  const depositLabel = service?.depositMinor
    ? formatCents(service.depositMinor)
    : defaultDepositLabel;

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
          <CheckIcon className="size-5" />
        </span>
          <p className="text-lg font-semibold">Poptávka odeslána</p>
          {done.statusCode && (
            <p className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              Kód rezervace:{" "}
              <span className="font-semibold tracking-wider">
                {done.statusCode}
              </span>
            </p>
          )}
          <p className="max-w-md text-sm text-muted-foreground text-pretty">
            {service?.depositMinor && service.depositMinor > 0
              ? `Až termín schválí, přijde vám e-mail s odkazem na úhradu zálohy ${depositLabel}. Termín se zablokuje až po její úhradě.`
              : "Až termín schválí, přijde vám e-mail s potvrzením."}
          </p>
          <p className="text-xs text-muted-foreground">
            Kód si můžete uložit – v e-mailu najdete i odkaz na stav rezervace.
          </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Krok {step} ze {STEPS.length}
          </p>
          <p className="text-xs font-medium">{STEPS[step - 1]}</p>
        </div>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((title, index) => (
            <span
              key={title}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index < step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      <div
        key={step}
        className={cn(
          "animate-in fade-in-0 duration-500 ease-brand motion-reduce:animate-none",
          direction === 1 ? "slide-in-from-right-4" : "slide-in-from-left-4"
        )}
      >
        {step === 1 && (
          <div className="space-y-3">
            {services.map((item) => {
              const active = serviceId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setServiceId(item.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-primary bg-primary/8"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{item.title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {item.durationMinutes}&nbsp;min
                      {item.priceMinor
                        ? ` · ${formatCents(item.priceMinor)}`
                        : ""}
                      {item.depositMinor && item.depositMinor > 0
                        ? ` · záloha ${formatCents(item.depositMinor)}`
                        : item.depositMinor === 0
                          ? " · bez zálohy"
                          : ""}
                    </span>
                  </span>
                  {active && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="size-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {errors.slot && (
              <p className="text-sm text-destructive" role="alert">
                {errors.slot}
              </p>
            )}
            {loadingSlots || hasSchedule === null ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-14 w-20 rounded-xl" />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-20 rounded-lg" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                </div>
              </div>
            ) : !hasSchedule ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
                <CalendarOffIcon className="size-6 text-muted-foreground" />
                <p className="font-medium">
                  Tatér zatím nemá otevřené termíny
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Jakmile si nastaví dostupnost, objeví se tady volné termíny.
                </p>
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
                <CalendarOffIcon className="size-6 text-muted-foreground" />
                <p className="font-medium">Teď nejsou volné termíny</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  V následujících dvou měsících není nic volného. Zkuste to
                  později nebo napište tatérovi přímo.
                </p>
              </div>
            ) : (
              <>
                {viewerTimezone && viewerTimezone !== artistTimezone && (
                  <p className="text-xs text-muted-foreground">
                    Časy vidíte ve svém pásmu ({viewerTimezone}). Tatér je má ve
                    svém pásmu ({artistTimezone}).
                  </p>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Nejbližší volné dny
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {nextDays.map((day) => {
                      const active = day === selectedDay;
                      const date = new Date(`${day}T12:00:00`);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => selectDay(day)}
                          aria-pressed={active}
                          className={cn(
                            "flex min-w-0 flex-col items-center gap-0.5 rounded-[10px] border px-2 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <span className="text-[11px] uppercase opacity-80">
                            {stripFormatter.format(date).split(" ")[0]}
                          </span>
                          <span className="text-sm font-semibold tabular-nums">
                            {date.getDate()}. {date.getMonth() + 1}.
                          </span>
                          <span
                            className={cn(
                              "text-[11px]",
                              active ? "opacity-80" : "text-muted-foreground"
                            )}
                          >
                            {slotsByDay[day]?.length ?? 0}{" "}
                            {plural(
                              slotsByDay[day]?.length ?? 0,
                              "termín",
                              "termíny",
                              "termínů"
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedDay && daySlots.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {dayFormatter.format(new Date(`${selectedDay}T12:00:00`))}
                      </p>
                      {GROUP_ORDER.map((group) => {
                        const groupSlots = daySlots.filter(
                          (slot) => slotGroup(new Date(slot.startIso)) === group
                        );
                        if (!groupSlots.length) return null;
                        return (
                          <div key={group} className="space-y-2">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                              {group}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {groupSlots.map((slot) => {
                                const active =
                                  selectedStartIso === slot.startIso;
                                return (
                                  <button
                                    key={slot.startIso}
                                    type="button"
                                    onClick={() =>
                                      setSelectedStartIso(slot.startIso)
                                    }
                                    aria-pressed={active}
                                    className={cn(
                                      "h-9 rounded-lg border px-3 text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      active
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                    )}
                                  >
                                    {timeFormatter.format(
                                      new Date(slot.startIso)
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  {!selectedDay && firstSlot && (
                    <button
                      type="button"
                      onClick={() => {
                        const date = new Date(firstSlot.startIso);
                        setCalendarMonth(
                          new Date(date.getFullYear(), date.getMonth(), 1)
                        );
                        selectDay(localDayKey(date));
                      }}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed text-sm transition-colors hover:bg-muted"
                    >
                      <CalendarDaysIcon className="size-4" />
                      Nejbližší volno:{" "}
                      {dayFormatter.format(new Date(firstSlot.startIso))},{" "}
                      {timeFormatter.format(new Date(firstSlot.startIso))}
                    </button>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowCalendar((value) => !value)}
                    aria-expanded={showCalendar}
                    className="flex h-9 items-center gap-2 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronDownIcon
                      className={cn(
                        "size-4 transition-transform",
                        showCalendar && "rotate-180"
                      )}
                    />
                    {showCalendar ? "Skrýt kalendář" : "Vybrat jiný termín"}
                  </button>
                  {showCalendar && (
                    <div className="mt-2 rounded-xl border p-3">
                      <Calendar
                        mode="single"
                        locale={cs}
                        className="w-full [--cell-size:2.25rem] sm:[--cell-size:2.5rem]"
                        selected={selectedSlotDate ?? undefined}
                        month={calendarMonth}
                        onMonthChange={setCalendarMonth}
                        onSelect={(date) =>
                          date && selectDay(localDayKey(date))
                        }
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (date < today) return true;
                          return !slotsByDay[localDayKey(date)];
                        }}
                        startMonth={
                          new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            1
                          )
                        }
                        endMonth={(() => {
                          const date = new Date();
                          date.setMonth(date.getMonth() + 3);
                          return new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            1
                          );
                        })()}
                      />
                    </div>
                  )}
                </div>
              </>
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
                  onChange={(event) => {
                    setClientName(event.target.value);
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  aria-invalid={Boolean(errors.name)}
                  required
                  maxLength={120}
                />
                {errors.name && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Telefon</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  autoComplete="tel"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
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
                onChange={(event) => {
                  setClientEmail(event.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={Boolean(errors.email)}
                required
              />
              {errors.email && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {service?.customFormFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={`field-${field.id}`}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={`field-${field.id}`}
                    required={field.required}
                    value={custom[field.id] ?? ""}
                    onChange={(event) =>
                      setCustom((prev) => ({
                        ...prev,
                        [field.id]: event.target.value,
                      }))
                    }
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={custom[field.id] ?? ""}
                    onValueChange={(value) =>
                      setCustom((prev) => ({ ...prev, [field.id]: value }))
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
                    onChange={(event) =>
                      setCustom((prev) => ({
                        ...prev,
                        [field.id]: event.target.value,
                      }))
                    }
                  />
                )}
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="description">Popis motivu</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Co byste chtěli, kam a jak velké…"
              />
            </div>

            <div className="space-y-2">
              <Label>Referenční fotky</Label>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  addFiles(Array.from(event.dataTransfer.files));
                }}
                className={cn(
                  "rounded-xl border border-dashed p-4 text-center transition-colors",
                  dragging ? "border-primary bg-primary/5" : "border-foreground/15"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files) {
                      addFiles(Array.from(event.target.files));
                    }
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1.5 rounded-lg py-2 transition-colors hover:bg-muted/50"
                >
                  <UploadIcon className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Přidat fotky (nepovinné)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Nejvýše {MAX_FILES} fotky, každá do 15 MB. Přetáhněte je sem
                    nebo klikněte.
                  </span>
                </button>
              </div>

              {files.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {files.map((file) => {
                    const key = file.name + file.size;
                    return (
                      <li key={key} className="relative">
                        {previews[key] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previews[key]}
                            alt={file.name}
                            className="size-20 rounded-lg object-cover ring-1 ring-foreground/10"
                          />
                        ) : (
                          <span className="flex size-20 items-center justify-center rounded-lg bg-muted">
                            <ImageIcon className="size-5 text-muted-foreground" />
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label={`Odebrat ${file.name}`}
                          onClick={() => removeOne(file)}
                          className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div
              className={cn(
                "space-y-2 rounded-xl bg-muted/40 p-3",
                errors.consent && "ring-1 ring-destructive/40"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(value) => {
                    setConsent(value === true);
                    setErrors((prev) => ({ ...prev, consent: undefined }));
                  }}
                  aria-invalid={Boolean(errors.consent)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="consent"
                  className="text-sm leading-relaxed font-normal"
                >
                  Souhlasím se zpracováním osobních údajů pro účel rezervace –
                  včetně citlivých údajů, které se mohou objevit v dotazníku nebo na
                  referenčních fotkách. Souhlas mohu kdykoli odvolat.{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="underline underline-offset-4"
                  >
                    Ochrana údajů
                  </Link>
                </Label>
              </div>
              {errors.consent && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.consent}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <dl className="divide-y divide-border rounded-xl border">
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Služba</dt>
                <dd className="text-right text-sm font-medium">
                  {service?.title ?? "—"}
                  {service ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {service.durationMinutes}&nbsp;min
                      {service.priceMinor
                        ? ` · ${formatCents(service.priceMinor)}`
                        : ""}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Termín</dt>
                <dd className="text-right text-sm font-medium tabular-nums">
                  {selectedSlotDate
                    ? `${dayFormatter.format(selectedSlotDate)}, ${timeFormatter.format(selectedSlotDate)}`
                    : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Kontakt</dt>
                <dd className="text-right text-sm font-medium">
                  {clientName}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {clientEmail}
                    {clientPhone ? ` · ${clientPhone}` : ""}
                  </span>
                </dd>
              </div>
              {files.length > 0 && (
                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-muted-foreground">Fotky</dt>
                  <dd className="text-right text-sm font-medium">
                    {files.length}{" "}
                    {files.length === 1 ? "fotka" : "fotky"}
                  </dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-4 bg-muted/40 px-4 py-3">
                <dt className="text-sm font-medium">Záloha</dt>
                <dd className="text-right text-sm font-semibold tabular-nums">
                  {depositLabel}
                  <span className="block text-xs font-normal text-muted-foreground">
                    odečte se z ceny
                  </span>
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Odesláním se nic neplatí. Nejprve termín potvrdí tatér,
              teprve pak dostanete odkaz na zaplacení zálohy. Termín se
              zablokuje až po její úhradě.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div aria-live="polite" className="sr-only">
          {errors.slot ?? errors.name ?? errors.email ?? errors.consent ?? ""}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => goTo(step - 1)}
            disabled={step === 1 || submitting}
            className={cn(step === 1 && "invisible")}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Zpět
          </Button>
          {step < 4 ? (
            <Button type="submit" disabled={submitting}>
              Pokračovat
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {uploading
                ? "Nahrávám fotky…"
                : submitting
                  ? "Odesílám…"
                  : "Odeslat poptávku"}
              {submitting || uploading ? (
                <Loader2Icon className="animate-spin" data-icon="inline-end" />
              ) : (
                <CheckIcon data-icon="inline-end" />
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
