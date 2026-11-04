import Link from "next/link";
import { LogoBlob, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            aria-label="Tattly.eu"
          >
            <LogoBlob className="size-8 lg:size-9" />
            <Wordmark className="text-base lg:text-lg" />
          </Link>
          <nav className="flex items-center gap-1.5">
            <Button
              asChild
              size="default"
              variant="ghost"
              className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <Link href="/artists">Najdi tatéra</Link>
            </Button>
            <Button asChild size="default">
              <Link href="/login">Pro tatéry</Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-start justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Tattly.eu – rezervace se zálohou</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/artists"
              className="transition-colors hover:text-foreground"
            >
              Najděte tatéra
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Ochrana údajů
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Podmínky
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
