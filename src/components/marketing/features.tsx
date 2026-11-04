import {
  CalendarCheckIcon,
  Check,
  ImageIcon,
  QrCodeIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Container, SectionHeading } from "./section";

function ScreeningVisual() {
  return (
    <div className="rounded-[18px] border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Poptávky</p>
        <span className="rounded-md bg-status-attention-soft px-2 py-1 text-[11px] font-medium text-status-attention">
          2 nové
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {[
          ["Petra K.", "Realismus · 2 reference", "Schválit", true],
          ["Martin Š.", "Blackwork · 1 reference", "Detail", false],
        ].map(([name, detail, action, primary]) => (
          <div
            key={String(name)}
            className="flex items-center gap-3 rounded-[12px] border border-border p-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-muted text-muted-foreground">
              <ImageIcon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{detail}</p>
            </div>
            <span
              className={
                primary
                  ? "shrink-0 rounded-[8px] bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground"
                  : "shrink-0 text-[11px] text-muted-foreground"
              }
            >
              {action}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <ShieldCheckIcon className="size-3.5" />
        Schvaluješ jen poptávky, které ti sedí.
      </div>
    </div>
  );
}

function DepositVisual() {
  return (
    <div className="rounded-[18px] border border-border bg-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Záloha</p>
          <p className="mt-1 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
            1 000 Kč
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-status-ok-soft px-2.5 py-1 text-[11px] font-medium text-status-ok">
          <Check className="size-3" />
          Přijato
        </span>
      </div>
      <div className="mt-5 flex items-center gap-4 rounded-[12px] border border-border bg-background p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
          <QrCodeIcon className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">QR platba</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Standard, který umí každá česká banka.
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Peníze jdou přímo na tvůj účet. Tattly si nebere nic.
      </p>
    </div>
  );
}

function CalendarVisual() {
  return (
    <div className="rounded-[18px] border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Týden</p>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CalendarCheckIcon className="size-3.5" />
          Google kalendář
        </span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((day, index) => (
          <div key={day} className="text-center">
            <p className="text-[10px] text-muted-foreground">{day}</p>
            <div className="mt-1.5 space-y-1">
              {Array.from({ length: 4 }).map((_, slot) => (
                <span
                  key={slot}
                  className={
                    (index === 1 && slot === 1) ||
                    (index === 3 && slot === 2) ||
                    (index === 4 && slot === 0)
                      ? "block h-3 rounded-[3px] bg-coffee/80"
                      : "block h-3 rounded-[3px] bg-muted"
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">Čtvrtek 14:00–16:00</span>
        <span className="font-medium text-status-ok">Potvrzeno</span>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    id: "screening",
    eyebrow: "01 / Screening",
    title: "Poptávky, které projdou tvým filtrem.",
    description:
      "Klient pošle reference a odpoví na tvůj dotazník ještě předtím, než se ozve. Ty vidíš jen to, co má smysl řešit.",
    points: [
      "Vlastní dotazník u každé služby",
      "Reference a fotky u poptávky",
      "Schválení jedním klikem",
    ],
    visual: <ScreeningVisual />,
  },
  {
    id: "zalohy",
    eyebrow: "02 / Zálohy",
    title: "Záloha dřív, než se rozjede stroj.",
    description:
      "Po schválení dostane klient odkaz na QR platbu. Peníze jdou přímo na tvůj účet a nezaplacený termín se sám uvolní.",
    points: [
      "QR platba bez prostředníka",
      "Automatické uvolnění po 24 hodinách",
      "Přehled zaplacených i čekajících záloh",
    ],
    visual: <DepositVisual />,
  },
  {
    id: "kalendar",
    eyebrow: "03 / Kalendář",
    title: "Kalendář, který drží krok.",
    description:
      "Volné termíny čteme z tvého Google kalendáře a potvrzená sezení do něj zapisujeme. Žádné dvojité rezervace.",
    points: [
      "Obousměrná synchronizace",
      "Připomínky klientům e-mailem",
      "Blokované dny a výjimky",
    ],
    visual: <CalendarVisual />,
  },
];

export function Features() {
  return (
    <section id="funkce" className="scroll-mt-20 border-t border-border">
      <Container className="py-20 sm:py-28">
        
          <SectionHeading
            eyebrow="Funkce"
            title="Všechno, co potřebuješ. Nic, co ne."
            description="Tattly nahradí tabulky, ruční e-maily i přepisování termínů. Ty se věnuješ tetování."
          />
        

        <div className="mt-16 space-y-16 sm:space-y-24">
          {FEATURES.map((feature, index) => (
            <div key={feature.id} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                  <p className="text-xs font-medium text-coffee">
                    {feature.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-balance sm:text-3xl">
                    {feature.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {feature.description}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {feature.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-coffee" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
                  {feature.visual}
                </div>
              </div>
            
          ))}
        </div>
      </Container>
    </section>
  );
}
