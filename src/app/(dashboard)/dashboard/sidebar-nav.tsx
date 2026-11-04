"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  CalendarDaysIcon,
  InboxIcon,
  LayoutDashboardIcon,
  SettingsIcon,
} from "lucide-react";
import { cn } from "cn";

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

export function SidebarNav({ attentionCount = 0 }: { attentionCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col">
      <div className="space-y-0.5">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const showCount = item.href === "/dashboard" && attentionCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {showCount ? (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium tabular-nums text-status-attention">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-status-attention"
                  />
                  {attentionCount > 99 ? "99+" : attentionCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <Link
        href="/dashboard/settings"
        aria-current={
          pathname.startsWith("/dashboard/settings") ? "page" : undefined
        }
        className={cn(
          "mt-auto flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          pathname.startsWith("/dashboard/settings")
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        <SettingsIcon className="size-4 shrink-0" />
        Nastavení
      </Link>
    </nav>
  );
}
