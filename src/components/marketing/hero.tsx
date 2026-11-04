import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "./section";

function ProductPreview() {
  return (
    <div className="relative">
      <div className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            Nejbližší termín
          </p>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-status-ok">
            <span aria-hidden className="size-1.5 rounded-full bg-status-ok" />
            Potvrzeno
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-5xl leading-none font-semibold tracking-[-0.05em] tabular-nums">
            14:00
          </span>
          <span className="text-base text-muted-foreground tabular-nums">
            – 16:00
          </span>
        </div>
        <p className="mt-3 text-lg font-semibold tracking-[-0.02em]">
          Lucie Nováková
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Realismus · 2 h
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="text-muted-foreground">Záloha 1 000 Kč</span>
          <span className="font-medium text-status-ok">uhrazeno</span>
        </div>
      </div>

      <div className="mt-3 rounded-[16px] border border-border bg-background p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            Na vás čeká
          </p>
          <span className="text-[11px] text-muted-foreground tabular-nums">2</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Petra K.</p>
            <p className="truncate text-xs text-muted-foreground">
              Nová poptávka · Realismus
            </p>
          </div>
          <span className="shrink-0 rounded-[8px] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            Schválit
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Martin Š.</p>
            <p className="truncate text-xs text-muted-foreground">
              Čeká na zálohu · 1 000 Kč
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            Detail
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[14px] border border-border bg-card px-4 py-3 text-xs">
        <span className="text-muted-foreground">Tento měsíc</span>
        <span className="font-semibold tabular-nums">24 500 Kč</span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section id="hero">
      <Container className="grid gap-12 pt-14 pb-16 sm:pt-20 sm:pb-20 lg:grid-cols-12 lg:items-center lg:gap-16 lg:pt-24">
        <div className="lg:col-span-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Rezervace pro tatéry
          </p>
          <h1 className="mt-4 text-[clamp(2.75rem,6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">
            Méně papírování.
            <br />
            Víc tetování.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
            Poptávky, zálohy i kalendář na jednom místě. Klienty si vybíráš ty,
            termíny se hlídají samy.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Button asChild size="lg">
              <Link href="/login">Začít zdarma</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/artists">Najít tatéra</Link>
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            Zdarma · zálohy přímo na tvůj účet
          </p>
        </div>

        <div className="lg:col-span-6">
          <ProductPreview />
        </div>
      </Container>
    </section>
  );
}
