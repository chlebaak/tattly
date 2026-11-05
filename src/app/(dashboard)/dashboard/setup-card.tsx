import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Onboarding } from "@/lib/onboarding";

export function SetupCard({ onboarding }: { onboarding: Onboarding }) {
  const percent = Math.round((onboarding.doneCount / onboarding.total) * 100);

  return (
    <div className="animate-enter flex flex-wrap items-center gap-4 rounded-[14px] border border-border bg-card px-4 py-3.5">
      <span className="text-xs font-medium text-muted-foreground tabular-nums">
        {onboarding.doneCount}/{onboarding.total}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Dokončete nastavení</p>
          <span className="text-xs text-muted-foreground tabular-nums">
            {percent} %
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-brand motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        {onboarding.nextItem ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Další krok: {onboarding.nextItem.label}
          </p>
        ) : null}
      </div>
      {onboarding.nextItem ? (
        <Button asChild size="sm" variant="outline">
          <Link href={onboarding.nextItem.href}>
            Pokračovat
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
