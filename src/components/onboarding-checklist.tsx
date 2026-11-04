import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { Onboarding } from "@/lib/onboarding";
import { cn } from "cn";

export function OnboardingChecklist({
  onboarding,
  className,
}: {
  onboarding: Onboarding;
  className?: string;
}) {
  const percent = Math.round((onboarding.doneCount / onboarding.total) * 100);

  return (
    <Panel className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-sm font-medium">
            {onboarding.complete
              ? "Vše je připraveno"
              : "Dokončení nastavení"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {onboarding.complete
              ? "Klienti si u vás mohou rezervovat."
              : `Hotovo ${onboarding.doneCount} z ${onboarding.total} kroků`}
          </p>
        </div>
        <span className="text-sm font-semibold tabular-nums">{percent}%</span>
      </div>
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-foreground transition-[width] duration-500 ease-brand motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="divide-y divide-border px-5">
        {onboarding.items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 py-3"
          >
            <span className="flex min-w-0 items-center gap-2.5 text-sm">
              <span
                className={
                  item.done
                    ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-status-ok text-white"
                    : "flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
                }
              >
                {item.done ? <CheckIcon className="size-3" /> : null}
              </span>
              <span
                className={cn(
                  "min-w-0",
                  item.done && "text-muted-foreground line-through"
                )}
              >
                {item.label}
              </span>
            </span>
            {!item.done && (
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={item.href}>Vyřídit</Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
