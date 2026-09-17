import type { ReactNode } from "react";
import { cn } from "cn";

export function SectionHeader({
  title,
  count,
  action,
  className,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-8 items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">
          {title}
        </h2>
        {count !== undefined && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
