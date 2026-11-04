"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BanIcon,
  CalendarClockIcon,
  HelpCircleIcon,
  MessageSquareIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCents } from "@/lib/utils";
import {
  cancelBooking,
  markRefunded,
  resolveClientRequest,
  sendClientMessage,
} from "./actions";
import { RescheduleDialog } from "./reschedule-dialog";
import type { BookingView } from "./booking-view";

const REQUEST_LABELS = {
  reschedule: {
    title: "Klient žádá o přesun termínu",
    icon: CalendarClockIcon,
  },
  cancel: { title: "Klient nemůže dorazit", icon: BanIcon },
  question: { title: "Klient má dotaz", icon: HelpCircleIcon },
} as const;

export function ClientRequestTask({ booking }: { booking: BookingView }) {
  const router = useRouter();
  const request = booking.openRequest;
  const [pending, startTransition] = useTransition();
  const [answerOpen, setAnswerOpen] = useState(false);
  const [message, setMessage] = useState("");

  if (!request) return null;
  const meta = REQUEST_LABELS[request.kind];

  function resolve(successMessage: string) {
    startTransition(async () => {
      const result = await resolveClientRequest({ bookingId: booking.id });
      if (!result.ok) {
        toast.error("Nepodařilo se označit jako vyřešené.");
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  function sendAnswer() {
    startTransition(async () => {
      const result = await sendClientMessage({
        bookingId: booking.id,
        message,
      });
      if (!result.ok) {
        toast.error("Zprávu se nepodařilo odeslat.");
        return;
      }
      setAnswerOpen(false);
      setMessage("");
      toast.success("Odpověď odeslána e-mailem.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-[18px] border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <meta.icon className="size-4 text-muted-foreground" />
            {meta.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {booking.clientName} · {booking.serviceTitle ?? "bez služby"}
            {booking.startLabel ? ` · ${booking.startLabel}` : ""}
          </p>
          {request.message && (
            <p className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
              „{request.message}“
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {request.kind === "reschedule" && (
            <RescheduleDialog
              booking={booking}
              trigger={
                <Button type="button" size="sm">
                  <CalendarClockIcon data-icon="inline-start" />
                  Upravit termín
                </Button>
              }
            />
          )}
          {request.kind === "cancel" && (
            <ConfirmDialog
              trigger={
                <Button type="button" size="sm" variant="destructive">
                  <BanIcon data-icon="inline-start" />
                  Stornovat
                </Button>
              }
              title="Stornovat rezervaci?"
              description={
                booking.depositAmount && booking.depositAmount > 0
                  ? `Klient dostane e-mail a záloha ${formatCents(booking.depositAmount)} se vrátí na jeho účet.`
                  : "Klient dostane e-mail o zrušení."
              }
              confirmLabel="Stornovat"
              tone="destructive"
              onConfirm={async () => {
                const result = await cancelBooking({
                  bookingId: booking.id,
                  refund: Boolean(
                    booking.depositAmount && booking.depositAmount > 0
                  ),
                });
                if (!result.ok) {
                  toast.error("Stornování se nezdařilo.");
                  return;
                }
                toast.success("Rezervace stornována, klient dostal e-mail.");
                router.refresh();
              }}
            />
          )}
          {request.kind === "question" && (
            <Button
              type="button"
              size="sm"
              onClick={() => setAnswerOpen(true)}
            >
              <MessageSquareIcon data-icon="inline-start" />
              Odpovědět
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => resolve("Označeno jako vyřešené.")}
          >
            Vyřešeno
          </Button>
        </div>
      </div>

      <Dialog open={answerOpen} onOpenChange={setAnswerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Odpovědět klientovi</DialogTitle>
            <DialogDescription>
              Zpráva odejde e-mailem a zapíše se do průběhu rezervace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`answer-${booking.id}`}>Zpráva</Label>
            <Textarea
              id={`answer-${booking.id}`}
              rows={4}
              maxLength={300}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Např.: Přesun je v pořádku, navrhuji čtvrtek odpoledne…"
            />
            <p className="text-xs text-muted-foreground">{message.length}/300</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAnswerOpen(false)}
              disabled={pending}
            >
              Zavřít
            </Button>
            <Button
              type="button"
              disabled={pending || message.trim().length < 2}
              onClick={sendAnswer}
            >
              {pending ? "Odesílám…" : "Odeslat odpověď"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RefundTask({
  booking,
  refundQr,
}: {
  booking: BookingView;
  refundQr: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [qrOpen, setQrOpen] = useState(false);
  const payment = booking.payment;

  if (!payment) return null;

  return (
    <div className="rounded-[18px] border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <WalletIcon className="size-4 text-muted-foreground" />
            Vrátit zálohu {formatCents(payment.amount, payment.currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {booking.clientName} · {booking.serviceTitle ?? "bez služby"}
          </p>
          <p className="mt-2 text-sm">
            {booking.clientIban ? (
              <>
                Poslat na účet{" "}
                <span className="font-medium tabular-nums">
                  {booking.clientIban}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Čekáme, až klient doplní číslo účtu na stavové stránce.
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {booking.clientIban && refundQr && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setQrOpen(true)}
            >
              Zobrazit QR
            </Button>
          )}
          <ConfirmDialog
            trigger={
              <Button type="button" size="sm" disabled={pending}>
                Zálohu jsem vrátil(a)
              </Button>
            }
            title="Označit zálohu jako vrácenou?"
            description={
              booking.clientIban
                ? `Potvrzujete, že jste poslal(a) ${formatCents(payment.amount, payment.currency)} na ${booking.clientIban}. Klient dostane e-mail.`
                : "Potvrzujete, že jste zálohu vrátil(a). Klient dostane e-mail."
            }
            confirmLabel="Označit jako vrácené"
            pendingLabel="Ukládám…"
            onConfirm={() => {
              startTransition(async () => {
                const result = await markRefunded({ bookingId: booking.id });
                if (!result.ok) {
                  toast.error("Nepodařilo se uložit. Zkuste to znovu.");
                  return;
                }
                toast.success("Vrácení zálohy zaznamenáno.");
                router.refresh();
              });
            }}
          />
        </div>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR pro vrácení zálohy</DialogTitle>
            <DialogDescription>
              Naskenujte ve své bankovní aplikaci – částka i účet klienta se
              předvyplní.
            </DialogDescription>
          </DialogHeader>
          {refundQr && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={refundQr}
                alt="QR pro vrácení zálohy"
                className="size-56 rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
