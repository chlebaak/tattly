"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ClockIcon, MailIcon, PhoneIcon, ShieldCheckIcon } from "lucide-react";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CopyButton } from "@/components/copy-button";
import { StatusBadge } from "@/components/status-badge";
import { formatCents } from "@/lib/utils";
import { getBookingAssets } from "./actions";
import { BookingActionsMenu, BookingPrimaryAction } from "./booking-actions";
import { BookingNotes } from "./booking-notes";
import { ClientMessageBox } from "./booking-message";
import { ClientRequestTask } from "./attention-tasks";
import { TIMELINE_STEPS, nextStepFor, timelineDone, type BookingView } from "./booking-view";

const TONE_CALLOUT: Record<string, string> = {
  attention: "bg-status-attention-soft text-status-attention",
  waiting: "bg-status-waiting-soft text-status-waiting",
  ok: "bg-status-ok-soft text-status-ok",
  muted: "bg-muted text-muted-foreground",
};

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-medium text-muted-foreground">{children}</p>
  );
}

export function BookingDetailSheet({
  booking,
  open,
  onOpenChange,
}: {
  booking: BookingView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [assetUrls, setAssetUrls] = useState<string[] | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);

  useEffect(() => {
    if (!open || booking.assetCount === 0 || assetUrls) return;
    let cancelled = false;
    setAssetsLoading(true);
    getBookingAssets({ bookingId: booking.id })
      .then((res) => {
        if (!cancelled && res.ok && res.urls) setAssetUrls(res.urls);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setAssetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, booking.id, booking.assetCount, assetUrls]);

  const step = nextStepFor(booking);
  const done = timelineDone(booking.status);
  const createdLabel = new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
  }).format(new Date(booking.createdAtIso));

  const hasFooter =
    booking.status === "pending_review" ||
    booking.status === "deposit_pending" ||
    booking.status === "confirmed" ||
    (booking.status === "completed" && booking.invoiceNumber !== null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full! flex-col gap-0 overflow-hidden p-0 sm:max-w-md!"
      >
        <SheetHeader className="border-b border-border bg-card px-5 py-4 pr-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-semibold">
                {booking.clientName}
              </SheetTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {booking.serviceTitle ?? "Bez služby"} · {createdLabel}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <MailIcon className="size-3.5 text-muted-foreground" />
              <a
                href={`mailto:${booking.clientEmail}`}
                className="rounded transition-colors hover:text-foreground"
              >
                {booking.clientEmail}
              </a>
              <CopyButton value={booking.clientEmail} label="E-mail" />
            </span>
            {booking.clientPhone && (
              <span className="inline-flex items-center gap-1.5">
                <PhoneIcon className="size-3.5 text-muted-foreground" />
                <a
                  href={`tel:${booking.clientPhone}`}
                  className="rounded transition-colors hover:text-foreground"
                >
                  {booking.clientPhone}
                </a>
                <CopyButton value={booking.clientPhone} label="Telefon" />
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
          <div
            className={cn(
              "rounded-[12px] px-3.5 py-3 text-sm",
              TONE_CALLOUT[step.tone]
            )}
          >
            <p className="font-semibold">{step.title}</p>
            <p className="mt-0.5 text-xs opacity-90">{step.description}</p>
          </div>

          {done > 0 && (
            <div className="grid grid-cols-4 gap-2" aria-label="Průběh rezervace">
              {TIMELINE_STEPS.map((label, index) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        index < done
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground"
                      )}
                    >
                      {index < done ? <CheckIcon className="size-3" /> : index + 1}
                    </span>
                    {index < TIMELINE_STEPS.length - 1 ? (
                      <span className="h-px flex-1 border-t border-dashed border-border" />
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "block text-[10px] leading-tight",
                      index < done
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div>
            <SectionLabel>Detaily</SectionLabel>
            <div className="divide-y divide-border">
              <InfoRow label="Služba">{booking.serviceTitle ?? "—"}</InfoRow>
              <InfoRow label="Termín">
                <span className="tabular-nums">
                  {booking.startLabel ?? "—"}
                </span>
              </InfoRow>
              {booking.durationMinutes && (
                <InfoRow label="Délka">
                  <span className="tabular-nums">
                    {booking.durationMinutes} min
                  </span>
                </InfoRow>
              )}
              {booking.priceMinor !== null && (
                <InfoRow label="Cena">
                  <span className="tabular-nums">
                    {formatCents(booking.priceMinor)}
                  </span>
                </InfoRow>
              )}
              {booking.depositAmount !== null && (
                <InfoRow label="Záloha">
                  <span className="tabular-nums">
                    {booking.depositAmount > 0
                      ? formatCents(booking.depositAmount)
                      : "bez zálohy"}
                    {booking.paymentMethod ? " · QR platba" : ""}
                  </span>
                </InfoRow>
              )}
              {booking.invoiceNumber && (
                <InfoRow label="Faktura">
                  <span className="tabular-nums">{booking.invoiceNumber}</span>
                </InfoRow>
              )}
              {booking.depositExpiresLabel &&
                booking.status === "deposit_pending" && (
                  <InfoRow label="Zaplatit do">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <ClockIcon className="size-3.5 text-muted-foreground" />
                      {booking.depositExpiresLabel}
                    </span>
                  </InfoRow>
                )}
            </div>
          </div>

          {booking.description && (
            <div>
              <SectionLabel>Popis od klienta</SectionLabel>
              <p className="whitespace-pre-line text-sm">
                {booking.description}
              </p>
            </div>
          )}

          {booking.customEntries.length > 0 && (
            <div>
              <SectionLabel>Dotazník</SectionLabel>
              <div className="divide-y divide-border">
                {booking.customEntries.map((entry) => (
                  <InfoRow key={entry.label} label={entry.label}>
                    {entry.value}
                  </InfoRow>
                ))}
              </div>
            </div>
          )}

          {booking.assetCount > 0 && (
            <div>
              <SectionLabel>
                Referenční fotky ({booking.assetCount})
              </SectionLabel>
              {assetsLoading || assetUrls === null ? (
                <div className="flex gap-2">
                  <Skeleton className="size-20 rounded-lg" />
                  <Skeleton className="size-20 rounded-lg" />
                  <Skeleton className="size-20 rounded-lg" />
                </div>
              ) : assetUrls.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Fotky se nepodařilo načíst.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {assetUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title="Otevřít v nové kartě"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Referenční fotka"
                        width={80}
                        height={80}
                        loading="lazy"
                        decoding="async"
                        className="size-20 rounded-lg object-cover ring-1 ring-foreground/10 transition-transform duration-200 ease-brand hover:scale-[1.02]"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {booking.assetsPurgeLabel && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Referenční fotky a odpovědi z dotazníku automaticky smažeme{" "}
                {booking.assetsPurgeLabel}.
              </span>
            </p>
          )}

          {booking.openRequest && (
            <ClientRequestTask booking={booking} />
          )}

          <BookingNotes bookingId={booking.id} initialNotes={booking.notes} />

          <ClientMessageBox bookingId={booking.id} />
        </div>

        {hasFooter && (
          <div className="flex items-center gap-2 border-t border-border bg-card px-5 py-3">
            <BookingPrimaryAction booking={booking} size="default" />
            <div className="ml-auto flex items-center gap-1.5">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Další akce
              </span>
              <BookingActionsMenu booking={booking} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
