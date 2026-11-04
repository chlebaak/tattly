import type { BookingStatus } from "@/lib/bookings";
import type { ClientRequest } from "@/db/schema";

export type BookingPayment = {
  status: "pending" | "succeeded" | "refunded" | "failed";
  amount: number;
  currency: string;
  refundedAtIso: string | null;
};

export type BookingView = {
  id: string;
  status: BookingStatus;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  description: string | null;
  notes: string | null;
  openRequest: ClientRequest | null;
  clientPaidAtIso: string | null;
  variableSymbol: string | null;
  clientIban: string | null;
  payment: BookingPayment | null;
  serviceTitle: string | null;
  customEntries: { label: string; value: string }[];
  startTimeIso: string | null;
  startDayKey: string | null;
  startLabel: string | null;
  startTimeLabel: string | null;
  proposedStartValue: string | null;
  durationMinutes: number | null;
  depositAmount: number | null;
  priceMinor: number | null;
  servicePriceMinor: number | null;
  serviceDepositMinor: number | null;
  serviceDurationMinutes: number | null;
  invoiceNumber: string | null;
  depositExpiresLabel: string | null;
  reminderSent: boolean;
  googleLinked: boolean;
  assetCount: number;
  /** Datum, kdy automaticky smažeme fotky a odpovědi (null = už proběhlo). */
  assetsPurgeLabel: string | null;
  defaultDepositCents: number;
  qrAvailable: boolean;
  paymentMethod: "stripe" | "qr" | "bank" | null;
  createdAtIso: string;
};

export const TIMELINE_STEPS = [
  "Poptávka",
  "Schválení",
  "Záloha",
  "Splněno",
] as const;

export function timelineDone(status: BookingStatus): number {
  if (status === "pending_review") return 1;
  if (status === "deposit_pending") return 2;
  if (status === "confirmed") return 3;
  if (status === "completed") return 4;
  return 0;
}

export type NextStep = {
  tone: "attention" | "waiting" | "ok" | "muted";
  title: string;
  description: string;
};

/** Co je na této rezervaci potřeba udělat – pro callout v detailu a na kartách. */
export function nextStepFor(booking: BookingView): NextStep {
  switch (booking.status) {
    case "pending_review":
      return {
        tone: "attention",
        title: "Čeká na vaše schválení",
        description: booking.startTimeIso
          ? "Zkontrolujte reference, potvrďte termín a pošlete klientovi odkaz na zálohu."
          : "Klient si nevybral termín – navrhněte mu ho v dialogu schválení.",
      };
    case "deposit_pending":
      if (booking.clientPaidAtIso) {
        return {
          tone: "ok",
          title: "Klient hlásí odeslanou platbu",
          description:
            "Zkontrolujte prosím svůj účet a potvrďte zálohu jedním klikem – teprve pak se termín zapíše do kalendáře.",
        };
      }
      return {
        tone: "waiting",
        title: "Čeká na zaplacení zálohy",
        description: booking.depositExpiresLabel
          ? `Klient má na zaplacení čas do ${booking.depositExpiresLabel}. Platbu potvrdíte jedním klikem.`
          : "Odkaz na QR platbu byl klientovi odeslán e-mailem.",
      };
    case "confirmed":
      return {
        tone: "ok",
        title: "Potvrzeno",
        description: booking.googleLinked
          ? "Termín je v Google kalendáři, klient dostal potvrzení i připomínku."
          : "Klient dostal potvrzení i připomínku e-mailem.",
      };
    case "completed":
      return {
        tone: "muted",
        title: "Splněno",
        description: booking.invoiceNumber
          ? "Faktura byla odeslána klientovi."
          : "Sezení proběhlo.",
      };
    case "expired":
      return {
        tone: "muted",
        title: "Vypršelo",
        description: "Klient zálohu nezaplatil včas a termín se uvolnil.",
      };
    case "cancelled":
      return {
        tone: "muted",
        title: "Zrušeno",
        description: "Termín byl zrušen a z kalendáře odstraněn.",
      };
    case "rejected":
      return {
        tone: "muted",
        title: "Odmítnuto",
        description: "Poptávka byla odmítnuta, klient dostal e-mail.",
      };
  }
}
