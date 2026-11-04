"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogoBlob, Wordmark } from "@/components/brand";

const NAV_LINKS = [
  { href: "#jak-to-funguje", label: "Jak to funguje" },
  { href: "#funkce", label: "Funkce" },
  { href: "#cena", label: "Cena" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader({
  loggedIn: initialLoggedIn,
}: {
  loggedIn?: boolean;
}) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn ?? false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (initialLoggedIn !== undefined) return;
    let cancelled = false;
    fetch("/api/auth/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => {
        if (!cancelled && session?.user) setLoggedIn(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initialLoggedIn]);

  const cta = loggedIn ? "Do aplikace" : "Začít zdarma";
  const ctaHref = loggedIn ? "/dashboard" : "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Tattly.eu"
        >
          <LogoBlob className="size-8" />
          <Wordmark className="text-base" />
        </Link>

        <nav
          aria-label="Hlavní navigace"
          className="ml-auto hidden items-center gap-7 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/artists"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
          >
            Najdi tatéra
          </Link>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href={ctaHref}>{cta}</Link>
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Otevřít menu"
                className="md:hidden"
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="flex items-center gap-2.5">
                <LogoBlob className="size-7" />
                <Wordmark className="text-sm" />
              </SheetTitle>
              <nav className="mt-4 flex flex-col">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="border-b border-border py-3.5 text-sm text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  href="/artists"
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border py-3.5 text-sm text-foreground"
                >
                  Najdi tatéra
                </Link>
              </nav>
              <Button asChild className="mt-6 w-full">
                <Link href={ctaHref} onClick={() => setMenuOpen(false)}>
                  {cta}
                </Link>
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
