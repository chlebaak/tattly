"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { getBookingAssets, rejectBookingAction, resendInvoice } from "./actions";
import { ApproveDialog } from "./approve-dialog";
import { BookingManageActions } from "./booking-manage-actions";
import { QrConfirmButton } from "./qr-confirm-button";
import { RescheduleDialog } from "./reschedule-dialog";
import { TIMELINE_STEPS, timelineDone, type BookingView } from "./booking-view";

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
  const [rejecting, setRejecting] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();

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

  const done = timelineDone(booking.status);

  async function reject() {
    if (!window.confirm("Odmítnout poptávku? Klientovi přijde e-mail.")) return;
    setRejecting(true);
    const result = await rejectBookingAction({ bookingId: booking.id });
    setRejecting(false);
    if (!result.ok) {
      toast.error(
        result.error === "INVALID_STATE"
          ? "Poptávka už není ke schválení."
          : "Odmítnutí se nezdařilo."
      );
      return;
    }
    toast.success("Poptávka odmítnuta, klient obdržel e-mail.");
    onOpenChange(false);
    router.refresh();
  }

  const hasActions =
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
        <SheetHeader className="border-b bg-popover/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="font-display text-xl">
              {booking.clientName}
            </SheetTitle>
            <StatusBadge status={booking.status} />
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">E-mail:</span>
              <span>{booking.clientEmail}</span>
              <CopyButton value={booking.clientEmail} label="E-mail" />
            </span>
            {booking.clientPhone && (
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Telefon:</span>
                <span>{booking.clientPhone}</span>
                <CopyButton value={booking.clientPhone} label="Telefon" />
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
          {done > 0 && (
            <div className="flex items-center gap-2">
              {TIMELINE_STEPS.map((step, index) => {
                const stepDone = index < done;
                return (
                  <div key={step} className="flex flex-1 items-center gap-2">
                    <span
                      className={
                        stepDone
                          ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : "flex size-5 shrink-0 items-center justify-center rounded-full border text-muted-foreground"
                      }
                    >
                      {stepDone ? <CheckIcon className="size-3" /> : index + 1}
                    </span>
                    <span
                      className={
                        index === TIMELINE_STEPS.length - 1
                          ? "hidden text-xs text-muted-foreground lg:block"
                          : "flex-1 border-t border-dashed border-border"
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <SectionLabel>Detaily</SectionLabel>
            <div className="divide-y divide-foreground/6">
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
                    {booking.paymentMethod === "qr"
                      ? " · QR"
                      : booking.paymentMethod === "stripe"
                        ? " · karta"
                        : ""}
                  </span>
                </InfoRow>
              )}
              {booking.invoiceNumber && (
                <InfoRow label="Faktura">
                  <span className="tabular-nums">
                    {booking.invoiceNumber}
                  </span>
                </InfoRow>
              )}
              {booking.depositExpiresLabel &&
                booking.status === "deposit_pending" && (
                  <InfoRow label="Zaplatit do">
                    <span className="tabular-nums">
                      {booking.depositExpiresLabel}
                    </span>
                  </InfoRow>
                )}
            </div>
          </div>

          {booking.description && (
            <div>
              <SectionLabel>Popis</SectionLabel>
              <p className="whitespace-pre-line text-sm">
                {booking.description}
              </p>
            </div>
          )}

          {booking.customEntries.length > 0 && (
            <div>
              <SectionLabel>Dotazník</SectionLabel>
              <div className="divide-y divide-foreground/6">
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
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Referenční fotka"
                        width={80}
                        height={80}
                        loading="lazy"
                        decoding="async"
                        className="size-20 rounded-lg object-cover ring-1 ring-foreground/10 transition-transform hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {hasActions && (
          <div className="border-t bg-popover/95 px-5 py-4 backdrop-blur">
            <SectionLabel>Akce</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {booking.status === "pending_review" && (
                <>
                  <ApproveDialog booking={booking} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={rejecting}
                    onClick={reject}
                  >
                    {rejecting ? "Odmítám…" : "Odmítnout"}
                  </Button>
                </>
              )}
              {booking.status === "deposit_pending" && (
                <>
                  {booking.qrAvailable && (
                    <QrConfirmButton bookingId={booking.id} />
                  )}
                  <RescheduleDialog booking={booking} />
                  <BookingManageActions
                    bookingId={booking.id}
                    status="deposit_pending"
                  />
                </>
              )}
              {booking.status === "confirmed" && (
                <>
                  <RescheduleDialog booking={booking} />
                  <BookingManageActions
                    bookingId={booking.id}
                    status="confirmed"
                  />
                </>
              )}
              {booking.status === "completed" && booking.invoiceNumber && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resending}
                  onClick={async () => {
                    setResending(true);
                    const result = await resendInvoice({
                      bookingId: booking.id,
                    });
                    setResending(false);
                    if (!result.ok) {
                      toast.error("Odeslání faktury se nezdařilo.");
                      return;
                    }
                    toast.success("Faktura odeslána klientovi.");
                  }}
                >
                  {resending ? "Posílám…" : "Poslat fakturu znovu"}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
