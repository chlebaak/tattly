"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const ITEMS = [
  { href: "/dashboard/settings/profile", label: "Profil" },
  { href: "/dashboard/settings/services", label: "Služby" },
  { href: "/dashboard/settings/availability", label: "Dostupnost" },
  { href: "/dashboard/settings/payments", label: "Platby" },
  { href: "/dashboard/settings/integrations", label: "Integrace" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Nastavení"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-9 shrink-0 items-center rounded-[10px] px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-card font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
