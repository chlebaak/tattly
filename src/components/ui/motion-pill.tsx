"use client";

import { cn } from "cn";
import type { SlidingPillState } from "@/lib/use-sliding-pill";

/**
 * Absolutně pozicovaný pill pod navigačními položkami. Sám je aria-hidden,
 * aktivní odkaz si nese aria-current.
 */
export function MotionPill({
  pill,
  animate,
  className,
}: {
  pill: SlidingPillState;
  animate: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-0 left-0",
        className
      )}
      style={{
        transform: `translate3d(${pill.x}px, ${pill.y}px, 0)`,
        width: pill.width,
        height: pill.height,
        opacity: pill.visible ? 1 : 0,
        transition: animate
          ? "transform 260ms var(--ease-brand), width 260ms var(--ease-brand), height 260ms var(--ease-brand), opacity 160ms var(--ease-brand)"
          : "opacity 160ms var(--ease-brand)",
        willChange: "transform, width, height, opacity",
      }}
    />
  );
}
