"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  ClockIcon,
  LayersIcon,
  PlugIcon,
  UserIcon,
} from "lucide-react";
import { cn } from "cn";

const groups = [
  {
    label: "Rezervace",
    items: [
      { href: "/dashboard", label: "Přehled", icon: ClipboardListIcon, exact: true },
      { href: "/dashboard/calendar", label: "Kalendář", icon: CalendarDaysIcon },
    ],
  },
  {
    label: "Nastavení",
    items: [
      { href: "/dashboard/settings/services", label: "Služby", icon: LayersIcon },
      { href: "/dashboard/settings/availability", label: "Dostupnost", icon: ClockIcon },
      { href: "/dashboard/settings/integrations", label: "Integrace", icon: PlugIcon },
      { href: "/dashboard/settings", label: "Profil", icon: UserIcon, exact: true },
    ],
  },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.label} className="space-y-0.5">
          <p className="px-3 pb-1 text-xs font-medium text-muted-foreground/80">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "bg-foreground/[0.06] font-medium text-foreground before:absolute before:top-1/2 before:left-0 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
