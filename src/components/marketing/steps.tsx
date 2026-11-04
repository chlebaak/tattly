import { Check, Clock } from "lucide-react";
import { Container, SectionHeading } from "./section";

function ScreeningVisual() {
  return (
    <div className="space-y-2 rounded-[14px] border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">Petra K.</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Realismus · 2 fotky
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">
          Schválit
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-1.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">Martin Š.</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Blackwork · 1 fotka
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-medium text-status-attention">
          Nová
        </span>
      </div>
    </div>
  );
}

function DepositVisual() {
  return (
    <div className="rounded-[14px] border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Záloha</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">1 000 Kč</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-status-ok-soft px-2 py-1 text-[10px] font-medium text-status-ok">
          <Check className="size-3" />
          Uhrazeno
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
        <Clock className="size-3.5" />
        QR platba · přímo na tvůj účet
      </div>
    </div>
  );
}

function SessionVisual() {
  return (
    <div className="rounded-[14px] border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
          <span className="text-[9px] leading-none uppercase">Čtv</span>
          <span className="text-sm leading-tight font-semibold tabular-nums">
            12
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">14:00–16:00 · Lucie</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Zapsáno do Google kalendáře
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, index) => (
          <span
            key={index}
            className={
              index === 3
                ? "h-1.5 rounded-full bg-primary"
                : "h-1.5 rounded-full bg-muted"
            }
          />
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  {
    number: "01",
    title: "Screening",
    description:
      "Klient pošle reference a odpoví na tvůj dotazník. Ty schválíš jen ty, které chceš.",
    visual: <ScreeningVisual />,
  },
  {
    number: "02",
    title: "Záloha",
    description:
      "Schválíš termín a klient dostane odkaz na zálohu. Nezaplacený termín se po 24 hodinách sám uvolní.",
    visual: <DepositVisual />,
  },
  {
    number: "03",
    title: "Sezení",
    description:
      "Potvrzené sezení se zapíše do tvého Google kalendáře. Připomínku dostane klient e-mailem.",
    visual: <SessionVisual />,
  },
];

export function Steps() {
  return (
    <section id="jak-to-funguje" className="scroll-mt-20 border-t border-border">
      <Container className="py-20 sm:py-28">
        
          <SectionHeading
            eyebrow="Jak to funguje"
            title="Tři kroky. Žádné papírování."
            description="Rezervace, záloha i kalendář na jednom místě. Ty se věnuješ klientům, zbytek běží sám."
          />
        

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <div key={step.number} className="border-t border-border pt-5">
                <p className="text-xs font-medium text-coffee tabular-nums">
                  {step.number}
                </p>
                <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
                  {step.title}
                </h3>
                <p className="mt-2 min-h-20 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                <div className="mt-5">{step.visual}</div>
              </div>
            
          ))}
        </div>
      </Container>
    </section>
  );
}
