import * as React from "react";
import { cn } from "cn";

export function Panel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card shadow-panel ring-1 ring-foreground/8",
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
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={cn("overflow-hidden", className)}>
      <div className="border-b border-foreground/8 px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-3 p-5">{children}</div>
    </Panel>
  );
}
