"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  CalendarDaysIcon,
  InboxIcon,
  LayoutDashboardIcon,
} from "lucide-react";
import { cn } from "cn";
import { MotionPill } from "@/components/ui/motion-pill";
import { useSlidingPill } from "@/lib/use-sliding-pill";

const ITEMS = [
  {
    href: "/dashboard",
    label: "Přehled",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  { href: "/dashboard/calendar", label: "Kalendář", icon: CalendarDaysIcon },
  { href: "/dashboard/bookings", label: "Rezervace", icon: InboxIcon },
  { href: "/dashboard/stats", label: "Statistiky", icon: BarChart3Icon },
];

export function MobileTabs({ attentionCount = 0 }: { attentionCount?: number }) {
  const pathname = usePathname();
  const activeKey = ITEMS.find((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  )?.href ?? null;
  const pill = useSlidingPill<HTMLDivElement>(activeKey, { padding: 4 });

  return (
    <nav
      aria-label="Hlavní navigace"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div ref={pill.containerRef} className="relative grid grid-cols-4">
        <MotionPill
          pill={pill.pill}
          animate={pill.animate}
          className="rounded-[12px] bg-accent"
        />
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              ref={pill.register(item.href)}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-10 flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                active ? "text-espresso" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <item.icon
                  className={cn("size-5", active && "text-espresso")}
                />
                {item.href === "/dashboard" && attentionCount > 0 ? (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-status-attention"
                  />
                ) : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
