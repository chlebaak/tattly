import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/bookings";
import { cn } from "cn";

type Tone = "attention" | "waiting" | "ok" | "muted";

const STATUS: Record<BookingStatus, Tone> = {
  pending_review: "attention",
  deposit_pending: "waiting",
  confirmed: "ok",
  completed: "muted",
  cancelled: "muted",
  rejected: "muted",
  expired: "muted",
};

const TONE: Record<Tone, { text: string; dot: string }> = {
  attention: { text: "text-status-attention", dot: "bg-status-attention" },
  waiting: { text: "text-status-waiting", dot: "bg-status-waiting" },
  ok: { text: "text-status-ok", dot: "bg-status-ok" },
  muted: { text: "text-muted-foreground", dot: "bg-muted-foreground/60" },
};

export function StatusBadge({
  status,
  size = "default",
  className,
}: {
  status: BookingStatus;
  size?: "sm" | "default";
  className?: string;
}) {
  const tone = TONE[STATUS[status]];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 font-medium whitespace-nowrap",
        size === "sm" ? "text-[11px]" : "text-xs",
        tone.text,
        className
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", tone.dot)}
      />
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}
