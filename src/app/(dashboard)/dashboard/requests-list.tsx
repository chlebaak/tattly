"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InboxIcon, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { cn } from "cn";
import type { BookingStatus } from "@/lib/bookings";
import { BookingRow } from "./booking-row";
import type { BookingView } from "./booking-view";

const FILTERS: { key: string; label: string; statuses: BookingStatus[] }[] = [
  { key: "all", label: "Vše", statuses: [] },
  {
    key: "pending_review",
    label: "Na schválení",
    statuses: ["pending_review"],
  },
  {
    key: "deposit_pending",
    label: "Na záloze",
    statuses: ["deposit_pending"],
  },
  { key: "confirmed", label: "Potvrzené", statuses: ["confirmed"] },
  {
    key: "history",
    label: "Historie",
    statuses: ["completed", "cancelled", "expired", "rejected"],
  },
];

type Props = {
  bookings: BookingView[];
  initialFilter?: string;
  publicSlug: string;
};

export function RequestsList({ bookings, initialFilter, publicSlug }: Props) {
  const valid = FILTERS.some((f) => f.key === initialFilter);
  const [filter, setFilter] = useState(valid ? initialFilter! : "all");
  const router = useRouter();

  function setF(key: string) {
    setFilter(key);
    router.replace(key === "all" ? "/dashboard" : `/dashboard?filtr=${key}`, {
      scroll: false,
    });
  }

  function copyLink() {
    const url = `${window.location.origin}/artist/${publicSlug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Odkaz na profil zkopírován"))
      .catch(() => toast.error("Kopírování se nezdařilo"));
  }

  const active = FILTERS.find((f) => f.key === filter)!;
  const filtered =
    filter === "all"
      ? bookings
      : bookings.filter((b) => active.statuses.includes(b.status));

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={InboxIcon}
        title="Zatím žádné rezervace"
        description="Sdílejte svůj rezervační odkaz na Instagramu a první poptávky se objeví zde."
        action={
          <Button type="button" size="sm" onClick={copyLink}>
            <LinkIcon data-icon="inline-start" />
            Kopírovat odkaz na profil
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full bg-muted p-1">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? bookings.length
              : bookings.filter((b) => f.statuses.includes(b.status)).length;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setF(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === f.key
                  ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}{" "}
              <span className="tabular-nums opacity-70">· {count}</span>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          V tomto filtru nic není.
        </p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
