import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/bookings";
import { cn } from "cn";

type Tone = "attention" | "waiting" | "ok" | "muted";

const TONES: Record<BookingStatus, { tone: Tone; pill: boolean }> = {
  pending_review: { tone: "attention", pill: true },
  deposit_pending: { tone: "waiting", pill: true },
  confirmed: { tone: "ok", pill: false },
  completed: { tone: "muted", pill: false },
  rejected: { tone: "muted", pill: false },
  expired: { tone: "muted", pill: false },
  cancelled: { tone: "muted", pill: false },
};

const DOT: Record<Tone, string> = {
  attention: "bg-status-attention",
  waiting: "bg-status-waiting",
  ok: "bg-status-ok",
  muted: "bg-status-muted",
};

const PILL: Record<Tone, string> = {
  attention: "bg-status-attention-soft",
  waiting: "bg-status-waiting-soft",
  ok: "",
  muted: "",
};

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const { tone, pill } = TONES[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full text-xs font-medium",
        pill
          ? cn("px-2 py-0.5 text-foreground", PILL[tone])
          : "text-muted-foreground",
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT[tone])} />
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}
