"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  MenuIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogoBlob, Wordmark } from "@/components/brand";
import { MotionPill } from "@/components/ui/motion-pill";
import { useSlidingPill } from "@/lib/use-sliding-pill";

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
  const [activeSection, setActiveSection] = useState<string | null>(null);

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

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY + 120;
      let current: string | null = null;
      for (const link of NAV_LINKS) {
        const section = document.getElementById(link.href.slice(1));
        if (section && section.offsetTop <= y) current = link.href;
      }
      setActiveSection(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const cta = loggedIn ? "Do aplikace" : "Začít zdarma";
  const ctaHref = loggedIn ? "/dashboard" : "/login";
  const shortCta = loggedIn ? "Aplikace" : "Začít";
  const pill = useSlidingPill<HTMLElement>(activeSection);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto grid h-16 w-full max-w-[1120px] grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8 xl:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Tattly.eu"
        >
          <LogoBlob className="size-8 lg:size-9" />
          <Wordmark className="text-base lg:text-lg" />
        </Link>

        <nav
          ref={pill.containerRef}
          aria-label="Hlavní navigace"
          className="relative hidden items-center gap-1 rounded-[12px] bg-muted/35 p-1 xl:flex"
        >
          <MotionPill
            pill={pill.pill}
            animate={pill.animate}
            className="rounded-[8px] border border-border bg-card"
          />
          {NAV_LINKS.map((link) => {
            const active = activeSection === link.href;
            return (
              <a
                key={link.href}
                ref={pill.register(link.href)}
                href={link.href}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "relative z-10 flex h-9 shrink-0 items-center whitespace-nowrap rounded-[8px] px-3 text-sm transition-colors duration-150",
                  active
                    ? "font-medium text-espresso"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                )}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center justify-self-end gap-1.5">
          <Button
            asChild
            variant="ghost"
            size="default"
            className="hidden whitespace-nowrap text-muted-foreground hover:text-foreground xl:inline-flex"
          >
            <Link href="/artists">
              <SearchIcon data-icon="inline-start" />
              Najdi tatéra
            </Link>
          </Button>

          <Button asChild size="default" className="hidden sm:inline-flex">
            <Link href={ctaHref}>
              {cta}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>

          <Button asChild size="default" className="sm:hidden">
            <Link href={ctaHref} aria-label={cta}>
              {shortCta}
            </Link>
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Otevřít menu"
                className="xl:hidden"
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              showCloseButton={false}
              className="flex w-full! flex-col gap-0 p-0 sm:max-w-sm"
            >
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5"
                  aria-label="Tattly.eu"
                >
                  <LogoBlob className="size-8" />
                  <Wordmark className="text-base" />
                </Link>
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Zavřít menu"
                  >
                    <XIcon className="size-5" />
                  </Button>
                </SheetClose>
              </div>

              <nav className="flex flex-col px-4 py-2">
                {NAV_LINKS.map((link, index) => {
                  const active = activeSection === link.href;
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "location" : undefined}
                      className={cn(
                        "flex min-h-14 items-center justify-between border-b border-border py-3.5 whitespace-nowrap",
                        active ? "text-espresso" : "text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-[11px] font-medium text-coffee/70 tabular-nums">
                          0{index + 1}
                        </span>
                        <span className="text-base font-medium">
                          {link.label}
                        </span>
                      </span>
                      <ChevronRightIcon className="size-4 text-muted-foreground" />
                    </a>
                  );
                })}
                <Link
                  href="/artists"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-14 items-center justify-between border-b border-border py-3.5 whitespace-nowrap text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <SearchIcon className="size-4 text-coffee" />
                    <span className="text-base font-medium">Najdi tatéra</span>
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </Link>
              </nav>

              <div className="mt-auto space-y-3 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button asChild className="w-full">
                  <Link href={ctaHref} onClick={() => setMenuOpen(false)}>
                    {cta}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Zdarma · zálohy přímo na tvůj účet
                </p>
                {!loggedIn ? (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Už máte účet? Přihlásit se
                  </Link>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
