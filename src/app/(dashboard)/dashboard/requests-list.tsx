"use client";

import { useMemo, useState } from "react";
import { InboxIcon, LinkIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "cn";
import type { BookingStatus } from "@/lib/bookings";
import { approveManyBookingsAction } from "./actions";
import { BookingTableRow } from "./booking-table-row";
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

const PAGE_SIZE = 15;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function RequestsList({
  bookings,
  initialFilter,
  publicSlug,
  truncated = false,
}: {
  bookings: BookingView[];
  initialFilter?: string;
  publicSlug: string;
  /** Přehled načítá jen poslední rok provozu – starší jsou v kalendáři. */
  truncated?: boolean;
}) {
  const valid = FILTERS.some((f) => f.key === initialFilter);
  const [filter, setFilter] = useState(valid ? initialFilter! : "all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "start">("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function setF(key: string) {
    setFilter(key);
    setVisible(PAGE_SIZE);
    setSelected(new Set());
    const url =
      key === "all"
        ? "/dashboard/bookings"
        : `/dashboard/bookings?filtr=${key}`;
    window.history.replaceState(null, "", url);
  }

  function copyLink() {
    const url = `${window.location.origin}/artist/${publicSlug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Odkaz na profil zkopírován"))
      .catch(() => toast.error("Kopírování se nezdařilo"));
  }

  const filtered = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter)!;
    const needle = normalize(query.trim());
    const list = bookings.filter((booking) => {
      if (active.statuses.length && !active.statuses.includes(booking.status)) {
        return false;
      }
      if (!needle) return true;
      return normalize(
        [
          booking.clientName,
          booking.clientEmail,
          booking.serviceTitle ?? "",
          booking.description ?? "",
        ].join(" ")
      ).includes(needle);
    });

    const sorted = [...list];
    if (sort === "newest") {
      sorted.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
    } else if (sort === "oldest") {
      sorted.sort((a, b) => a.createdAtIso.localeCompare(b.createdAtIso));
    } else {
      sorted.sort((a, b) => {
        if (!a.startTimeIso) return 1;
        if (!b.startTimeIso) return -1;
        return a.startTimeIso.localeCompare(b.startTimeIso);
      });
    }
    return sorted;
  }, [bookings, filter, query, sort]);

  const selectableIds = useMemo(
    () =>
      filtered
        .filter((booking) => booking.status === "pending_review")
        .map((booking) => booking.id),
    [filtered]
  );
  const selectedCount = selected.size;

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

  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div
          role="tablist"
          aria-label="Filtr rezervací"
          className="-mx-4 flex gap-5 overflow-x-auto px-4 lg:mx-0 lg:px-0"
        >
          {FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? bookings.length
                : bookings.filter((b) => f.statuses.includes(b.status)).length;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setF(f.key)}
                className={cn(
                  "flex min-h-9 shrink-0 items-center gap-1.5 border-b-2 pb-1 text-sm transition-[color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Jméno, e-mail, popis…"
              aria-label="Hledat v rezervacích"
              className="pl-9"
            />
          </div>
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as typeof sort)}
          >
            <SelectTrigger aria-label="Řazení" className="w-36 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="newest">Nejnovější</SelectItem>
              <SelectItem value="oldest">Nejstarší</SelectItem>
              <SelectItem value="start">Podle termínu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectableIds.length > 0 && selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-3 py-2 animate-enter">
          <p className="text-sm">
            Vybráno <span className="font-semibold">{selectedCount}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Zrušit výběr
            </Button>
            <ConfirmDialog
              trigger={<Button size="sm">Schválit vybrané</Button>}
              title={`Schválit ${selectedCount} ${
                selectedCount === 1
                  ? "rezervaci"
                  : selectedCount < 5
                    ? "rezervace"
                    : "rezervací"
              }?`}
              description="Použije se termín, který si klient vybral, a výchozí záloha ze služby. Rezervace bez navrženého termínu se přeskočí."
              confirmLabel="Schválit vybrané"
              pendingLabel="Schvaluji…"
              onConfirm={async () => {
                const result = await approveManyBookingsAction({
                  bookingIds: Array.from(selected),
                });
                setSelected(new Set());
                if (result.approved === 0) {
                  toast.error(
                    "Nepodařilo se schválit ani jednu rezervaci. Zkontrolujte platby a termíny."
                  );
                  return;
                }
                toast.success(
                  result.skipped > 0
                    ? `Schváleno ${result.approved}, přeskočeno ${result.skipped} (chybí termín nebo platby).`
                    : result.approved === 1
                      ? "Schválena 1 rezervace – klient dostal odkaz na zálohu."
                      : result.approved <= 4
                        ? `Schváleny ${result.approved} rezervace – klienti dostali odkaz na zálohu.`
                        : `Schváleno ${result.approved} rezervací – klienti dostali odkaz na zálohu.`
                );
              }}
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="Nic jsme nenašli"
          description="Zkuste jiný výraz nebo zrušte filtr."
          action={
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery("");
                setF("all");
              }}
            >
              Zrušit filtry
            </Button>
          }
        />
      ) : (
        <>
          <div className="animate-enter overflow-hidden rounded-[18px] border border-border bg-card" style={{ animationDelay: "40ms" }}>
            <div className="hidden items-center gap-3 border-b border-border px-4 py-2.5 text-[11px] font-medium text-muted-foreground sm:flex">
              <span aria-hidden className="w-4 shrink-0" />
              <span className="grid flex-1 grid-cols-[minmax(0,1.3fr)_170px_minmax(0,1fr)_120px] gap-4">
                <span>Klient</span>
                <span>Termín</span>
                <span>Služba</span>
                <span>Stav</span>
              </span>
              <span className="w-[76px] shrink-0 text-right">Akce</span>
            </div>
            <ul>
              {shown.map((booking) => (
                <BookingTableRow
                  key={booking.id}
                  booking={booking}
                  selectable={booking.status === "pending_review"}
                  selected={selected.has(booking.id)}
                  onSelectedChange={(next) => {
                    setSelected((prev) => {
                      const copy = new Set(prev);
                      if (next) copy.add(booking.id);
                      else copy.delete(booking.id);
                      return copy;
                    });
                  }}
                />
              ))}
            </ul>
          </div>
          {filtered.length > shown.length && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisible((value) => value + PAGE_SIZE)}
              >
                Zobrazit další ({filtered.length - shown.length})
              </Button>
            </div>
          )}
          {truncated && (
            <p className="px-1 pt-2 text-center text-xs text-muted-foreground">
              V přehledu je poslední rok provozu. Starší rezervace najdete
              v kalendáři.
            </p>
          )}
        </>
      )}
    </div>
  );
}
