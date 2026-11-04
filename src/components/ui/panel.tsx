import * as React from "react";
import { cn } from "cn";

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-border bg-card",
        className
      )}
      {...props}
    />
  );
}

export function PanelSection({
  title,
  description,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Panel id={id} className={cn("scroll-mt-24 overflow-hidden", className)}>
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </Panel>
  );
}
