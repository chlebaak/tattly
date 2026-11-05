"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CheckCheckIcon,
  CopyIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { AvatarUploader } from "@/components/avatar-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import {
  updateBilling,
  updatePublicProfile,
  type ProfileActionState,
} from "@/app/(dashboard)/dashboard/settings/actions";
import { saveService } from "@/app/(dashboard)/dashboard/settings/services/actions";
import { saveBookingRules } from "@/app/(dashboard)/dashboard/settings/availability/actions";

const STEP_LABELS = [
  "Představení",
  "První služba",
  "Pracovní doba",
  "Platby",
  "Hotovo",
];

const DAYS = [
  { key: "mon", label: "Po" },
  { key: "tue", label: "Út" },
  { key: "wed", label: "St" },
  { key: "thu", label: "Čt" },
  { key: "fri", label: "Pá" },
  { key: "sat", label: "So" },
  { key: "sun", label: "Ne" },
];

export function OnboardingWizard({
  initialStep,
  displayName,
  studioName,
  bio,
  avatarUrl,
  timezone,
  hasServices,
  hasSchedule,
  bankAccount,
  publicUrl,
}: {
  initialStep: number;
  displayName: string;
  studioName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  timezone: string;
  hasServices: boolean;
  hasSchedule: boolean;
  bankAccount: string | null;
  publicUrl: string;
}) {
  const [step, setStep] = useState(initialStep);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">
          Dokončení nastavení
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ještě pár kroků a můžete přijímat rezervace.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Krok {step} z {STEP_LABELS.length}
          </p>
          <p className="text-xs font-medium">{STEP_LABELS[step - 1]}</p>
        </div>
        <div className="flex gap-1" aria-hidden>
          {STEP_LABELS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-150",
                index < step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      <Panel className="p-5 sm:p-6">
        <div key={step} className="animate-enter">
          {step === 1 && (
            <IdentityStep
              displayName={displayName}
              studioName={studioName}
              bio={bio}
              avatarUrl={avatarUrl}
              onDone={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <ServiceStep
              hasServices={hasServices}
              onDone={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <ScheduleStep
              timezone={timezone}
              hasSchedule={hasSchedule}
              onDone={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <PaymentsStep
              bankAccount={bankAccount}
              onDone={() => setStep(5)}
            />
          )}
          {step === 5 && (
            <DoneStep publicUrl={publicUrl} onBack={() => setStep(4)} />
          )}
        </div>
      </Panel>
    </div>
  );
}

function StepHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function IdentityStep({
  displayName,
  studioName,
  bio,
  avatarUrl,
  onDone,
}: {
  displayName: string;
  studioName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updatePublicProfile, null);
  const [name, setName] = useState(displayName);
  const [avatar, setAvatar] = useState(avatarUrl ?? "");

  useEffect(() => {
    if (state?.ok) {
      toast.success("Profil uložen.");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction}>
      <StepHeader
        title="Představte se klientům"
        description="Takhle vás uvidí na rezervační stránce. Vše se dá později změnit."
      />
      <div className="space-y-5">
        <AvatarUploader
          name="avatarUrl"
          value={avatar}
          onChange={setAvatar}
          displayName={name}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="onb-name">Jméno nebo název</Label>
            <Input
              id="onb-name"
              name="displayName"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onb-studio">Studio (nepovinné)</Label>
            <Input
              id="onb-studio"
              name="studioName"
              maxLength={120}
              defaultValue={studioName ?? ""}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="onb-bio">Pár vět o sobě (nepovinné)</Label>
          <Textarea
            id="onb-bio"
            name="bio"
            rows={3}
            maxLength={2000}
            defaultValue={bio ?? ""}
            placeholder="Co tvoříte, jak pracujete, co si od vás klient odnese."
          />
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Přeskočit
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : "Pokračovat"}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}

function ServiceStep({
  hasServices,
  onDone,
}: {
  hasServices: boolean;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    const durationMinutes = Number(duration);
    if (title.trim().length < 2) {
      toast.error("Zadejte název služby (alespoň 2 znaky).");
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5) {
      toast.error("Délka musí být alespoň 5 minut.");
      return;
    }
    startTransition(async () => {
      const result = await saveService({
        title: title.trim(),
        durationMinutes,
        priceCzk: price.trim() ? Number(price) : undefined,
        depositCzk: deposit.trim() ? Number(deposit) : undefined,
        customFormFields: [],
      });
      if (!result.ok) {
        toast.error("Službu se nepodařilo uložit. Zkontrolujte údaje.");
        return;
      }
      toast.success("Služba přidána.");
      onDone();
    });
  }

  return (
    <div>
      <StepHeader
        title="Co klientům nabízíte"
        description="Stačí jedna služba. Další služby, screeningové otázky a délky doladíte v Nastavení → Služby."
      />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="onb-service">Název služby</Label>
          <Input
            id="onb-service"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Tetování na míru"
            maxLength={120}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="onb-duration">Délka (min)</Label>
            <Input
              id="onb-duration"
              type="number"
              min={5}
              step={15}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onb-price">Cena (Kč)</Label>
            <Input
              id="onb-price"
              type="number"
              min={0}
              step={100}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Dle domluvy"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onb-deposit">Záloha (Kč)</Label>
            <Input
              id="onb-deposit"
              type="number"
              min={0}
              step={50}
              value={deposit}
              onChange={(event) => setDeposit(event.target.value)}
              placeholder="např. 1000"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Záloha se platí předem – termín se zablokuje až po jejím uhrazení.
          Když ji necháte prázdnou, použije se výchozí záloha z nastavení.
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          {hasServices ? "Přeskočit" : "Přeskočit, doplním později"}
        </Button>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Ukládám…" : "Přidat službu"}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function ScheduleStep({
  timezone,
  hasSchedule,
  onDone,
}: {
  timezone: string;
  hasSchedule: boolean;
  onDone: () => void;
}) {
  const [days, setDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("17:00");
  const [pending, startTransition] = useTransition();

  function save() {
    if (days.length === 0) {
      toast.error("Vyberte alespoň jeden pracovní den.");
      return;
    }
    if (from >= to) {
      toast.error("Konec pracovní doby musí být po jejím začátku.");
      return;
    }
    const weeklySchedule: Record<string, { from: string; to: string }[]> = {};
    for (const day of days) {
      weeklySchedule[day] = [{ from, to }];
    }
    startTransition(async () => {
      const result = await saveBookingRules({
        timezone,
        minLeadTimeHours: 24,
        slotIntervalMinutes: 30,
        weeklySchedule,
      });
      if (!result.ok) {
        toast.error("Pracovní dobu se nepodařilo uložit.");
        return;
      }
      toast.success("Pracovní doba je nastavená.");
      onDone();
    });
  }

  if (hasSchedule) {
    return (
      <div>
        <StepHeader
          title="Pracovní doba"
          description="Pracovní dobu už máte nastavenou. Tady ji nepřepisujeme, ať o nic nepřijdete."
        />
        <Button asChild variant="outline">
          <Link href="/dashboard/settings/availability">
            Upravit pracovní dobu
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
        <div className="mt-6 flex justify-end border-t pt-4">
          <Button type="button" onClick={onDone}>
            Pokračovat
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        title="Kdy vás klienti mohou zastihnout"
        description="Podle téhle doby se klientům nabízejí volné termíny. Stačí základ, výjimky doladíte později."
      />
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((day) => {
            const active = days.includes(day.key);
            return (
              <button
                key={day.key}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setDays((prev) =>
                    prev.includes(day.key)
                      ? prev.filter((value) => value !== day.key)
                      : [...prev, day.key]
                  )
                }
                className={cn(
                  "h-9 w-12 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        <div className="grid max-w-sm grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="onb-from">Od</Label>
            <Input
              id="onb-from"
              type="time"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onb-to">Do</Label>
            <Input
              id="onb-to"
              type="time"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Přeskočit
        </Button>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Ukládám…" : "Nastavit pracovní dobu"}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function PaymentsStep({
  bankAccount,
  onDone,
}: {
  bankAccount: string | null;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updateBilling, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Bankovní účet uložen.");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div>
      <StepHeader
        title="Jak přijímáte zálohy"
        description="Klient zaplatí zálohu QR platbou přímo na váš účet. Když účet nevyplníte, budeme rezervace potvrzovat rovnou a bez zálohy."
      />
      <div className="space-y-5">
        <div className="rounded-xl border p-4">
          <p className="text-sm font-medium">QR platba na účet</p>
          <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
            Klient naskenuje QR kód v bankovní aplikaci a pošle zálohu. Peníze
            máte na účtu během chvíle a vy platbu potvrdíte jedním klikem.
          </p>
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1 space-y-2">
              <Label htmlFor="onb-bank">Bankovní účet (IBAN)</Label>
              <Input
                id="onb-bank"
                name="bankAccount"
                spellCheck={false}
                maxLength={64}
                defaultValue={bankAccount ?? ""}
                placeholder="CZ6508000000192000145399"
              />
            </div>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Ukládám…" : "Uložit účet"}
            </Button>
          </form>
        </div>

        <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Bez vyplněného účtu se rezervace potvrzují okamžitě a bez zálohy.
          Můžete ho doplnit kdykoli později v Nastavení → Platby.
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Přeskočit
        </Button>
        <Button type="button" onClick={onDone}>
          Pokračovat
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function DoneStep({
  publicUrl,
  onBack,
}: {
  publicUrl: string;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-status-ok-soft text-status-ok">
        <CheckCheckIcon className="size-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold">
        Hotovo – můžete přijímat rezervace
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Tenhle odkaz dejte do Instagram bio nebo ho pošlete klientovi. Uvidí
        vaše služby, volné termíny i ceny.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm">{publicUrl}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard
              .writeText(publicUrl)
              .then(() => {
                setCopied(true);
                toast.success("Odkaz zkopírován");
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => toast.error("Kopírování se nezdařilo"));
          }}
        >
          {copied ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <CopyIcon data-icon="inline-start" />
          )}
          {copied ? "Zkopírováno" : "Kopírovat"}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href={publicUrl} target="_blank" rel="noreferrer">
            <ExternalLinkIcon data-icon="inline-start" />
            Otevřít
          </a>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          Zpět
        </Button>
        <Button asChild>
          <Link href="/dashboard">
            Přejít na přehled
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
