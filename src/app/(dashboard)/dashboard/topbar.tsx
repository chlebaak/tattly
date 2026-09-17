"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserMenu } from "./user-menu";

const TITLES: Record<string, string> = {
  "/dashboard": "Přehled",
  "/dashboard/calendar": "Kalendář",
  "/dashboard/settings": "Nastavení",
  "/dashboard/settings/services": "Služby",
  "/dashboard/settings/availability": "Dostupnost",
  "/dashboard/settings/integrations": "Integrace",
};

export function Topbar({
  displayName,
  email,
  slug,
  avatarUrl,
  children,
}: {
  displayName: string;
  email: string;
  slug: string;
  avatarUrl: string | null;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-foreground/8 bg-background/85 px-4 backdrop-blur">
      {children}
      <h1 className="min-w-0 truncate font-display text-xl">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <UserMenu
          displayName={displayName}
          email={email}
          slug={slug}
          avatarUrl={avatarUrl}
        />
      </div>
    </header>
  );
}
