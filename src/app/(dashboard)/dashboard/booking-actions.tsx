"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BanIcon,
  CalendarClockIcon,
  CheckCheckIcon,
  CheckIcon,
  EllipsisIcon,
  SendIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCents } from "@/lib/utils";
import {
  cancelBooking,
  completeBooking,
  confirmQrPayment,
  rejectBookingAction,
  resendInvoice,
} from "./actions";
import { ApproveDialog } from "./approve-dialog";
import { RescheduleDialog } from "./reschedule-dialog";
import type { BookingView } from "./booking-view";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: "Zkontrolujte zadané údaje.",
  INVALID_STATE: "Rezervace už je v jiném stavu.",
  NOT_FOUND: "Rezervace nenalezena.",
  NOT_INVOICED: "K rezervaci není vystavená faktura.",
  UNKNOWN: "Něco se pokazilo. Zkuste to znovu.",
};

type ActionResult = { ok: boolean; error?: string };

function QrConfirmAction({
  booking,
  size,
  variant,
  label,
  trigger,
  open,
  onOpenChange,
}: {
  booking: BookingView;
  size: "sm" | "default";
  variant: "default" | "outline";
  label?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        trigger ?? (
          <Button type="button" size={size} variant={variant}>
            <CheckIcon data-icon="inline-start" />
            {label ?? "Záloha přijata (QR)"}
          </Button>
        )
      }
      open={open}
      onOpenChange={onOpenChange}
      title="Potvrdit přijetí zálohy?"
      description={
        booking.depositAmount
          ? `Záloha ${formatCents(booking.depositAmount)} dorazila na účet. Termín se potvrdí, zapíše do kalendáře a klient dostane e-mail.`
          : "Termín se potvrdí, zapíše do kalendáře a klient dostane e-mail."
      }
      confirmLabel="Potvrdit zálohu"
      pendingLabel="Potvrzuji…"
      onConfirm={async () => {
        const result = await confirmQrPayment({ bookingId: booking.id });
        if (!result.ok) {
          toast.error(
            result.error === "INVALID_STATE"
              ? "Rezervace už není ve stavu čekání na zálohu."
              : "Potvrzení se nezdařilo."
          );
          return;
        }
        toast.success("Záloha potvrzena – termín jsme potvrdili.");
        router.refresh();
      }}
    />
  );
}

/** Hlavní akce podle stavu rezervace – tlačítko v řádku nebo v detailu. */
export function BookingPrimaryAction({
  booking,
  size = "sm",
  variant = "default",
  label,
}: {
  booking: BookingView;
  size?: "sm" | "default";
  variant?: "default" | "outline";
  /** Kratší popisek pro tabulky a frontu. */
  label?: string;
}) {
  if (booking.status === "pending_review") {
    return (
      <ApproveDialog
        booking={booking}
        trigger={
          <Button type="button" size={size} variant={variant}>
            {label ?? "Schválit"}
          </Button>
        }
      />
    );
  }
  if (booking.status === "deposit_pending" && booking.qrAvailable) {
    return (
      <QrConfirmAction
        booking={booking}
        size={size}
        variant={variant}
        label={label}
      />
    );
  }
  return null;
}

type ConfirmKind =
  | "reject"
  | "confirm_qr"
  | "complete"
  | "cancel_refund"
  | "cancel_norefund"
  | "resend_invoice";

/** Sekundární a destruktivní akce v menu „…“. */
export function BookingActionsMenu({
  booking,
  align = "end",
}: {
  booking: BookingView;
  align?: "start" | "end";
}) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);

  const refundAmount = booking.depositAmount ?? 0;
  const canApprove = booking.status === "pending_review";
  const canQr =
    booking.status === "deposit_pending" && booking.qrAvailable;
  const canReschedule =
    booking.status === "deposit_pending" || booking.status === "confirmed";
  const canComplete = booking.status === "confirmed";
  const canCancel =
    booking.status === "deposit_pending" || booking.status === "confirmed";
  const canResendInvoice =
    booking.status === "completed" && booking.invoiceNumber !== null;

  const hasItems =
    canApprove ||
    canQr ||
    canReschedule ||
    canComplete ||
    canCancel ||
    canResendInvoice;

  async function run(fn: () => Promise<ActionResult>, success: string) {
    const result = await fn();
    if (!result.ok) {
      toast.error(
        ERROR_MESSAGES[result.error ?? "UNKNOWN"] ?? ERROR_MESSAGES.UNKNOWN
      );
      return;
    }
    toast.success(success);
    router.refresh();
  }

  if (!hasItems) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Další akce"
          >
            <EllipsisIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-56">
          {canApprove && (
            <DropdownMenuItem onSelect={() => setApproveOpen(true)}>
              <CheckIcon />
              Schválit a poslat zálohu
            </DropdownMenuItem>
          )}
          {canQr && (
            <DropdownMenuItem onSelect={() => setConfirmKind("confirm_qr")}>
              <CheckIcon />
              Záloha přijata (QR)
            </DropdownMenuItem>
          )}
          {canReschedule && (
            <DropdownMenuItem onSelect={() => setRescheduleOpen(true)}>
              <CalendarClockIcon />
              Upravit termín
            </DropdownMenuItem>
          )}
          {canComplete && (
            <DropdownMenuItem onSelect={() => setConfirmKind("complete")}>
              <CheckCheckIcon />
              Označit jako splněné
            </DropdownMenuItem>
          )}
          {canResendInvoice && (
            <DropdownMenuItem onSelect={() => setConfirmKind("resend_invoice")}>
              <SendIcon />
              Poslat fakturu znovu
            </DropdownMenuItem>
          )}
          {(canApprove || canCancel) && <DropdownMenuSeparator />}
          {canApprove && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmKind("reject")}
            >
              <XIcon />
              Odmítnout poptávku
            </DropdownMenuItem>
          )}
          {canCancel && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() =>
                setConfirmKind(refundAmount > 0 ? "cancel_refund" : "cancel_norefund")
              }
            >
              <BanIcon />
              {refundAmount > 0 ? "Stornovat a vrátit zálohu" : "Stornovat"}
            </DropdownMenuItem>
          )}
          {canCancel && refundAmount > 0 && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmKind("cancel_norefund")}
            >
              <BanIcon />
              Stornovat bez vrácení (klient nedorazil)
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canApprove && (
        <ApproveDialog
          booking={booking}
          open={approveOpen}
          onOpenChange={setApproveOpen}
        />
      )}
      {canReschedule && (
        <RescheduleDialog
          booking={booking}
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
        />
      )}

      <ConfirmDialog
        open={confirmKind === "confirm_qr"}
        onOpenChange={(open) => setConfirmKind(open ? "confirm_qr" : null)}
        title="Potvrdit přijetí zálohy?"
        description={
          booking.depositAmount
            ? `Záloha ${formatCents(booking.depositAmount)} dorazila na účet. Termín se potvrdí, zapíše do kalendáře a klient dostane e-mail.`
            : "Termín se potvrdí, zapíše do kalendáře a klient dostane e-mail."
        }
        confirmLabel="Potvrdit zálohu"
        pendingLabel="Potvrzuji…"
        onConfirm={() =>
          run(
            () => confirmQrPayment({ bookingId: booking.id }),
            "Záloha potvrzena – termín jsme potvrdili."
          )
        }
      />
      <ConfirmDialog
        open={confirmKind === "reject"}
        onOpenChange={(open) => setConfirmKind(open ? "reject" : null)}
        title="Odmítnout poptávku?"
        description={`${booking.clientName} dostane e-mail s odmítnutím. Termín zůstane volný pro ostatní.`}
        confirmLabel="Odmítnout"
        tone="destructive"
        onConfirm={() =>
          run(
            () => rejectBookingAction({ bookingId: booking.id }),
            "Poptávka odmítnuta, klient obdržel e-mail."
          )
        }
      />
      <ConfirmDialog
        open={confirmKind === "complete"}
        onOpenChange={(open) => setConfirmKind(open ? "complete" : null)}
        title="Označit jako splněné?"
        description="Sezení proběhlo. Klientovi se odešle faktura, pokud má rezervace vyplněnou cenu."
        confirmLabel="Označit jako splněné"
        onConfirm={() =>
          run(
            () => completeBooking({ bookingId: booking.id }),
            "Rezervace označena jako splněná."
          )
        }
      />
      <ConfirmDialog
        open={confirmKind === "cancel_refund"}
        onOpenChange={(open) => setConfirmKind(open ? "cancel_refund" : null)}
        title="Stornovat a vrátit zálohu?"
        description={`Záloha ${formatCents(refundAmount)} se vrátí klientovi a termín se uvolní. Klient dostane e-mail.`}
        confirmLabel="Stornovat a vrátit"
        tone="destructive"
        onConfirm={() =>
          run(
            () => cancelBooking({ bookingId: booking.id, refund: true }),
            "Rezervace stornována a záloha vrácena."
          )
        }
      />
      <ConfirmDialog
        open={confirmKind === "cancel_norefund"}
        onOpenChange={(open) => setConfirmKind(open ? "cancel_norefund" : null)}
        title="Stornovat bez vrácení zálohy?"
        description={
          refundAmount > 0
            ? `Použijte, když klient nedorazil. Záloha ${formatCents(refundAmount)} klientovi zůstane. Termín se uvolní a klient dostane e-mail.`
            : "Termín se uvolní a klient dostane e-mail."
        }
        confirmLabel="Stornovat bez vrácení"
        tone="destructive"
        onConfirm={() =>
          run(
            () => cancelBooking({ bookingId: booking.id, refund: false }),
            "Rezervace stornována."
          )
        }
      />
      <ConfirmDialog
        open={confirmKind === "resend_invoice"}
        onOpenChange={(open) => setConfirmKind(open ? "resend_invoice" : null)}
        title="Poslat fakturu znovu?"
        description={`Faktura ${booking.invoiceNumber ?? ""} se znovu odešle na ${booking.clientEmail}.`}
        confirmLabel="Poslat fakturu"
        onConfirm={() =>
          run(
            () => resendInvoice({ bookingId: booking.id }),
            "Faktura odeslána klientovi."
          )
        }
      />
    </>
  );
}
