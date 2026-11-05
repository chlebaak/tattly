"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarOffIcon, ChevronDownIcon, PlusIcon, TrashIcon } from "lucide-react";
import { fromZonedTime } from "date-fns-tz";
import type { BookingRules } from "@/db/schema";
import { cn } from "cn";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthCalendar, type MonthDay } from "@/components/month-calendar";
import {
  generateSlotsForWindow,
  resolveSlotInterval,
  type BusyInterval,
} from "@/lib/slots";
import { getBusyForMonth, saveBookingRules } from "./actions";

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Pondělí" },
  { key: "tue", label: "Úterý" },
  { key: "wed", label: "Středa" },
  { key: "thu", label: "Čtvrtek" },
  { key: "fri", label: "Pátek" },
  { key: "sat", label: "Sobota" },
  { key: "sun", label: "Neděle" },
];

const TIMEZONES = [
  "Europe/Prague",
  "Europe/Bratislava",
  "Europe/Vienna",
  "Europe/Berlin",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Europe/London",
  "UTC",
];

const WEEKDAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

type Window = { from: string; to: string };
type ExceptionDraft = { closed: boolean; windows: Window[] };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function weekdayKeyOf(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return WEEKDAY_KEYS[new Date(y!, (m ?? 1) - 1, d!).getDay()] ?? "sun";
}

export function ScheduleEditor({
  timezone,
  rules,
  services,
}: {
  timezone: string;
  rules: BookingRules;
  services: {
    id: string;
    title: string;
    durationMinutes: number;
    slotIntervalMinutes: number | null;
  }[];
}) {
  const [tz, setTz] = useState(timezone);
  const [schedule, setSchedule] = useState<Record<string, Window[]>>(() => {
    const initial: Record<string, Window[]> = {};
    for (const d of DAYS) {
      initial[d.key] = (rules.weeklySchedule?.[d.key] ?? []).map((w) => ({
        from: w.from,
        to: w.to,
      }));
    }
    return initial;
  });
  const [exceptions, setExceptions] = useState<
    Record<string, ExceptionDraft>
  >(() => {
    const initial: Record<string, ExceptionDraft> = {};
    for (const [key, val] of Object.entries(rules.exceptions ?? {})) {
      initial[key] = {
        closed: val.closed,
        windows: (val.windows ?? []).map((w) => ({ from: w.from, to: w.to })),
      };
    }
    return initial;
  });
  const [leadHours, setLeadHours] = useState(
    String(rules.minLeadTimeHours ?? 24)
  );
  const [slotInterval, setSlotInterval] = useState(
    rules.slotIntervalMinutes ? String(rules.slotIntervalMinutes) : ""
  );
  const [previewServiceId, setPreviewServiceId] = useState(
    services[0]?.id ?? ""
  );
  const [maxPerDay, setMaxPerDay] = useState(
    rules.maxBookingsPerDay ? String(rules.maxBookingsPerDay) : ""
  );
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string>(todayKey());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState<BusyInterval[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        tz,
        leadHours,
        slotInterval,
        maxPerDay,
        schedule: DAYS.map((day) => [day.key, schedule[day.key]]),
        exceptions: Object.entries(exceptions).sort(([a], [b]) =>
          a.localeCompare(b)
        ),
      }),
    [tz, leadHours, slotInterval, maxPerDay, schedule, exceptions]
  );
  const baseline = useRef(snapshot);
  const dirty = snapshot !== baseline.current;
  useUnsavedChanges(dirty);

  const leadNum = Number.isFinite(Number(leadHours))
    ? Number(leadHours)
    : 24;
  const intervalValue = slotInterval.trim() ? Number(slotInterval) : null;
  const previewService =
    services.find((service) => service.id === previewServiceId) ??
    services[0] ??
    null;
  const previewInterval = previewService
    ? resolveSlotInterval(
        { slotIntervalMinutes: intervalValue },
        previewService
      )
    : Math.max(5, intervalValue ?? 30);
  const previewDuration = previewService?.durationMinutes ?? previewInterval;

  const fmtTime = useMemo(
    () =>
      new Intl.DateTimeFormat("cs-CZ", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      }),
    [tz]
  );

  useEffect(() => {
    const from = new Date(
      calMonth.getFullYear(),
      calMonth.getMonth(),
      1
    );
    const to = new Date(
      calMonth.getFullYear(),
      calMonth.getMonth() + 1,
      0,
      23,
      59
    );
    let cancelled = false;
    getBusyForMonth({
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
    })
      .then((res) => {
        if (cancelled || !res.ok || !res.busy) return;
        setBusy(
          res.busy.map((b) => ({
            start: new Date(b.startIso),
            end: new Date(b.endIso),
          }))
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [calMonth]);

  const earliestStart = useMemo(
    () => new Date(Date.now() + Math.max(0, leadNum) * 60 * 60 * 1000),
    [leadNum]
  );

  function windowsForDay(dayKey: string, ignoreException = false): Window[] {
    if (!ignoreException) {
      const ex = exceptions[dayKey];
      if (ex) return ex.closed ? [] : ex.windows;
    }
    return schedule[weekdayKeyOf(dayKey)] ?? [];
  }

  function daySlots(dayKey: string): string[] {
    const out: string[] = [];
    for (const w of windowsForDay(dayKey)) {
      const slots = generateSlotsForWindow({
        windowStart: fromZonedTime(`${dayKey}T${w.from}:00`, tz),
        windowEnd: fromZonedTime(`${dayKey}T${w.to}:00`, tz),
        durationMinutes: previewDuration,
        intervalMinutes: previewInterval,
        busy,
        earliestStart,
      });
      for (const slot of slots) out.push(fmtTime.format(slot.start));
    }
    return out;
  }

  const monthDays = useMemo(() => {
    const days: Record<string, MonthDay> = {};
    const year = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad2(m + 1)}-${pad2(d)}`;
      const ex = exceptions[key];
      const times = key >= todayKey() ? daySlots(key) : [];
      days[key] = {
        chips: times.map((time, i) => ({
          id: `${key}-${i}`,
          timeLabel: time,
          label: "",
        })),
        state: ex?.closed
          ? "closed"
          : ex
            ? "exception"
            : (schedule[weekdayKeyOf(key)]?.length ?? 0) > 0
              ? "open"
              : undefined,
      };
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calMonth, schedule, exceptions, previewDuration, previewInterval, busy, tz, earliestStart]);

  function updateDay(key: string, windows: Window[]) {
    setSchedule((prev) => ({ ...prev, [key]: windows }));
  }

  /** Rychlá šablona pro první nastavení: vyplní zvolené dny 9–17. */
  function applyPreset(keys: string[]) {
    setSchedule((prev) => {
      const next = { ...prev };
      for (const day of DAYS) {
        next[day.key] = keys.includes(day.key)
          ? [{ from: "09:00", to: "17:00" }]
          : [];
      }
      return next;
    });
    toast.info("Šablona vložena – nezapomeňte ji uložit.");
  }

  function copyFirstDayToAll() {
    const first = DAYS.map((d) => schedule[d.key]).find((w) => w.length > 0);
    if (!first) {
      setError("Nejdřív vyplňte hodiny aspoň u jednoho dne.");
      return;
    }
    setSchedule((prev) => {
      const next = { ...prev };
      for (const d of DAYS) next[d.key] = first.map((w) => ({ ...w }));
      return next;
    });
  }

  function clearAll() {
    setSchedule((prev) => {
      const next = { ...prev };
      for (const d of DAYS) next[d.key] = [];
      return next;
    });
  }

  const ex = exceptions[selectedDay];
  const isPast = selectedDay < todayKey();
  const weeklyWin = windowsForDay(selectedDay, true);
  const slots = daySlots(selectedDay);
  const stateLabel = ex?.closed
    ? "Zavřeno (výjimka)"
    : ex
      ? "Výjimka – jiné hodiny"
      : weeklyWin.length > 0
        ? "Otevřeno podle týdenního plánu"
        : "Zavřeno (bez plánu)";

  function ensureException(windows: Window[]) {
    setExceptions((prev) => ({
      ...prev,
      [selectedDay]: { closed: false, windows },
    }));
  }

  function closeDay() {
    setExceptions((prev) => ({
      ...prev,
      [selectedDay]: { closed: true, windows: [] },
    }));
  }

  function removeException() {
    setExceptions((prev) => {
      const next = { ...prev };
      delete next[selectedDay];
      return next;
    });
  }

  function updateExceptionWindow(index: number, patch: Partial<Window>) {
    setExceptions((prev) => {
      const current = prev[selectedDay];
      if (!current) return prev;
      return {
        ...prev,
        [selectedDay]: {
          ...current,
          windows: current.windows.map((w, i) =>
            i === index ? { ...w, ...patch } : w
          ),
        },
      };
    });
  }

  function addExceptionWindow() {
    setExceptions((prev) => {
      const current = prev[selectedDay];
      if (!current) return prev;
      return {
        ...prev,
        [selectedDay]: {
          ...current,
          windows: [...current.windows, { from: "18:00", to: "21:00" }],
        },
      };
    });
  }

  function removeExceptionWindow(index: number) {
    setExceptions((prev) => {
      const current = prev[selectedDay];
      if (!current) return prev;
      return {
        ...prev,
        [selectedDay]: {
          ...current,
          windows: current.windows.filter((_, i) => i !== index),
        },
      };
    });
  }

  async function onSave() {
    setError(null);
    setSaved(false);
    const lead = Number(leadHours);
    const interval = slotInterval.trim() ? Number(slotInterval) : undefined;
    if (!Number.isInteger(lead) || lead < 0 || lead > 720) {
      setError("Předstih musí být 0–720 hodin.");
      return;
    }
    if (
      interval !== undefined &&
      (!Number.isInteger(interval) || interval < 5 || interval > 240)
    ) {
      setError("Rozestup startů musí být 5–240 minut, nebo prázdné.");
      return;
    }
    let max: number | undefined;
    if (maxPerDay) {
      const n = Number(maxPerDay);
      if (!Number.isInteger(n) || n < 1 || n > 50) {
        setError("Limit na den musí být 1–50.");
        return;
      }
      max = n;
    }
    const weeklySchedule: Record<string, Window[]> = {};
    for (const d of DAYS) {
      const windows = schedule[d.key].filter((w) => w.from && w.to);
      if (windows.length) weeklySchedule[d.key] = windows;
    }
    const exceptionsPayload: Record<string, ExceptionDraft> = {};
    for (const [key, exDraft] of Object.entries(exceptions)) {
      if (key < todayKey()) continue;
      exceptionsPayload[key] = {
        closed: exDraft.closed,
        windows: exDraft.closed ? [] : exDraft.windows.filter((w) => w.from && w.to),
      };
    }
    setPending(true);
    const result = await saveBookingRules({
      timezone: tz,
      minLeadTimeHours: lead,
      slotIntervalMinutes: interval,
      maxBookingsPerDay: max,
      weeklySchedule,
      exceptions: exceptionsPayload,
    });
    setPending(false);
    if (!result.ok) {
      setError(
        result.error === "INVALID_INPUT"
          ? "Zkontrolujte zadané údaje (čas ve formátu HH:MM a začátek dříve než konec)."
          : "Uložení se nezdařilo."
      );
      return;
    }
    setSaved(true);
    baseline.current = snapshot;
    router.refresh();
  }

  const upcomingDays = useMemo(() => {
    const out: {
      key: string;
      label: string;
      times: string[];
    }[] = [];
    const now = new Date();
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset
      );
      const key = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
      out.push({
        key,
        label:
          offset === 0
            ? "Dnes"
            : offset === 1
              ? "Zítra"
              : new Intl.DateTimeFormat("cs-CZ", {
                  weekday: "short",
                  day: "numeric",
                  month: "numeric",
                }).format(date),
        times: daySlots(key),
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, exceptions, previewDuration, previewInterval, busy, tz, earliestStart]);

  return (
    <div className="space-y-6">
      <Panel className="p-5">
        <button
          type="button"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground select-none hover:text-foreground"
        >
          Pokročilé nastavení
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform duration-200 ease-brand",
              advancedOpen && "rotate-180"
            )}
          />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-[250ms] ease-brand motion-reduce:transition-none",
            advancedOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tz">Časová zóna</Label>
                  <Select value={tz} onValueChange={setTz}>
                    <SelectTrigger id="tz" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead">Min. předstih (hod)</Label>
                  <Input
                    id="lead"
                    type="number"
                    min={0}
                    max={720}
                    value={leadHours}
                    onChange={(e) => setLeadHours(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">
                    Jak často mohou termíny začínat (min)
                  </Label>
                  <Input
                    id="interval"
                    type="number"
                    min={5}
                    max={240}
                    value={slotInterval}
                    onChange={(e) => setSlotInterval(e.target.value)}
                    placeholder="Podle délky služby"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nechte prázdné = starty podle délky služby. Každá služba si
                    může nastavit vlastní rozestup.
                  </p>
                </div>
              </div>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="maxperday">
                  Max. rezervací za den (prázdné = bez limitu)
                </Label>
                <Input
                  id="maxperday"
                  type="number"
                  min={1}
                  max={50}
                  value={maxPerDay}
                  onChange={(e) => setMaxPerDay(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid items-start gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
        <div className="space-y-2">
          <MonthCalendar
            size="lg"
            month={calMonth}
            onMonthChange={setCalMonth}
            days={monthDays}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            className="w-full xl:w-[560px]"
          />
          <p className="hidden items-center gap-4 px-2 text-xs text-muted-foreground sm:flex">
            <span>Čísla = volné starty u zvolené služby</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-status-waiting" />
              výjimka
            </span>
            <span>přeškrtnuto = zavřeno</span>
          </p>

          <Panel className="space-y-3 p-5">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Nejbližší volné termíny</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Jak to uvidí klienti. Počítá se i s rezervacemi a Google
                  kalendářem.
                </p>
              </div>
              {services.length > 0 ? (
                <Select
                  value={previewService?.id ?? ""}
                  onValueChange={setPreviewServiceId}
                >
                  <SelectTrigger
                    aria-label="Služba pro náhled"
                    className="h-9 w-full"
                  >
                    <SelectValue placeholder="Vyberte službu" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.title} · {service.durationMinutes} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nejprve si vytvořte službu – náhled se pak ukáže pro ni.
                </p>
              )}
              {previewService && (
                <p className="text-xs text-muted-foreground">
                  Starty po {previewInterval} min. Služba blokuje{" "}
                  {previewDuration} min.
                </p>
              )}
            </div>
            <div className="divide-y divide-border">
              {upcomingDays.map((day) => (
                <div
                  key={day.key}
                  className="flex items-start justify-between gap-3 py-2"
                >
                  <span className="w-20 shrink-0 text-sm text-muted-foreground first-letter:uppercase">
                    {day.label}
                  </span>
                  {day.times.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      zavřeno
                    </span>
                  ) : (
                    <span className="flex flex-wrap justify-end gap-1">
                      {day.times.slice(0, 6).map((time) => (
                        <span
                          key={time}
                          className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums"
                        >
                          {time}
                        </span>
                      ))}
                      {day.times.length > 6 && (
                        <span className="self-center text-xs text-muted-foreground">
                          +{day.times.length - 6}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel
          key={selectedDay}
          className="space-y-4 p-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-brand motion-reduce:animate-none"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold tracking-tight">
              {new Intl.DateTimeFormat("cs-CZ", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(new Date(`${selectedDay}T12:00:00`))}
            </p>
            <Badge variant={ex?.closed ? "outline" : ex ? "secondary" : "outline"}>
              {stateLabel}
            </Badge>
          </div>

          {isPast ? (
            <p className="text-sm text-muted-foreground">
              Minulý den – jen náhled, úpravy nejsou možné.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Termíny pro klienty
                </p>
                {slots.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarOffIcon className="size-4" />
                    Žádné termíny – v tento den se klientům nic nenabízí.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {slots.map((time, i) => (
                      <span
                        key={`${time}-${i}`}
                        className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t pt-3">
                {!ex && weeklyWin.length > 0 && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Otevírá se podle týdenního opakování. Potřebujete to jinak?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => ensureException(weeklyWin.map((w) => ({ ...w })))}
                      >
                        <PlusIcon data-icon="inline-start" />
                        Výjimka s těmito hodinami
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={closeDay}
                      >
                        Zavřít tento den
                      </Button>
                    </div>
                  </>
                )}
                {!ex && weeklyWin.length === 0 && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Týdenní plán pro tento den nemá hodiny.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        ensureException([{ from: "09:00", to: "17:00" }])
                      }
                    >
                      <PlusIcon data-icon="inline-start" />
                      Otevřít tento den
                    </Button>
                  </>
                )}
                {ex?.closed && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Den je zavřený výjimkou. Po odebrání se vrátí týdenní plán.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          ensureException(
                            weeklyWin.length
                              ? weeklyWin.map((w) => ({ ...w }))
                              : [{ from: "09:00", to: "17:00" }]
                          )
                        }
                      >
                        Změnit na jiné hodiny
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={removeException}
                      >
                        Odebrat výjimku
                      </Button>
                    </div>
                  </>
                )}
                {ex && !ex.closed && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Výjimka – hodiny tohoto dne přepisují týdenní plán.
                    </p>
                    <div className="space-y-2">
                      {ex.windows.map((w, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            type="time"
                            aria-label={`Výjimka – otevřeno od (okno ${i + 1})`}
                            value={w.from}
                            onChange={(e) =>
                              updateExceptionWindow(i, { from: e.target.value })
                            }
                            className="w-28"
                          />
                          <span className="text-sm text-muted-foreground">–</span>
                          <Input
                            type="time"
                            aria-label={`Výjimka – otevřeno do (okno ${i + 1})`}
                            value={w.to}
                            onChange={(e) =>
                              updateExceptionWindow(i, { to: e.target.value })
                            }
                            className="w-28"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Odebrat okno"
                            onClick={() => removeExceptionWindow(i)}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addExceptionWindow}
                      >
                        Přidat okno
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => closeDay()}
                      >
                        Zavřít celý den
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={removeException}
                      >
                        Odebrat výjimku
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </Panel>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-sm font-medium">Týdenní opakování</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                applyPreset(["mon", "tue", "wed", "thu", "fri"])
              }
            >
              Šablona Po–Pá 9–17
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                applyPreset(["mon", "tue", "wed", "thu", "fri", "sat"])
              }
            >
              Po–So 9–17
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={copyFirstDayToAll}>
              Zkopírovat první den na všechny
            </Button>
            <ConfirmDialog
              trigger={
                <Button type="button" variant="ghost" size="sm">
                  Vymazat vše
                </Button>
              }
              title="Vymazat celý týden?"
              description="Smažou se hodiny u všech dnů. Změna se projeví až po uložení, takže ji můžete do té doby vrátit obnovením stránky."
              confirmLabel="Vymazat"
              tone="destructive"
              onConfirm={clearAll}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {DAYS.map((d) => {
            const windows = schedule[d.key];
            const enabled = windows.length > 0;
            return (
              <div key={d.key} className="space-y-3 rounded-xl bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`day-${d.key}`}
                    aria-label={`${d.label} – otevřeno`}
                    checked={enabled}
                    onCheckedChange={(v) =>
                      updateDay(
                        d.key,
                        v === true ? [{ from: "09:00", to: "17:00" }] : []
                      )
                    }
                  />
                  <Label htmlFor={`day-${d.key}`} className="font-medium">
                    {d.label}
                  </Label>
                </div>
                {enabled && (
                  <div className="space-y-2">
                    {windows.map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          type="time"
                          aria-label={`${d.label} – od`}
                          value={w.from}
                          onChange={(e) =>
                            updateDay(
                              d.key,
                              windows.map((x, xi) =>
                                xi === i ? { ...x, from: e.target.value } : x
                              )
                            )
                          }
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">–</span>
                        <Input
                          type="time"
                          aria-label={`${d.label} – do`}
                          value={w.to}
                          onChange={(e) =>
                            updateDay(
                              d.key,
                              windows.map((x, xi) =>
                                xi === i ? { ...x, to: e.target.value } : x
                              )
                            )
                          }
                          className="w-24"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Odebrat okno"
                          onClick={() =>
                            updateDay(
                              d.key,
                              windows.filter((_, xi) => xi !== i)
                            )
                          }
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateDay(d.key, [
                          ...windows,
                          { from: "18:00", to: "21:00" },
                        ])
                      }
                    >
                      Přidat okno
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(dirty || pending || saved || error) && (
        <div className="sticky bottom-16 z-20 -mx-4 border-t border-border bg-background px-4 py-3 lg:bottom-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={cn(
                "text-sm",
                error
                  ? "text-destructive"
                  : dirty || pending
                    ? "text-muted-foreground"
                    : "text-status-ok"
              )}
            >
              {error
                ? error
                : pending
                  ? "Ukládám…"
                  : dirty
                    ? "Neuložené změny"
                    : "Uloženo – dostupnost se promítne do rezervačního formuláře."}
            </p>
            <Button type="button" onClick={onSave} disabled={pending || !dirty}>
              {pending ? "Ukládám…" : "Uložit dostupnost"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
