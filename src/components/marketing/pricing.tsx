import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, SectionHeading } from "./section";

const INCLUDED = [
  "Neomezené rezervace",
  "QR platby a zálohy",
  "Google kalendář",
  "Automatické e-maily",
  "Veřejná stránka s odkazem",
  "Fotky referencí v úložišti",
];

export function Pricing() {
  return (
    <section id="cena" className="scroll-mt-20 border-t border-border">
      <Container className="py-20 sm:py-28">
        
          <SectionHeading
            eyebrow="Cena"
            title="Zdarma. Bez provize."
            description="Žádné předplatné, žádné skryté poplatky. Zálohy chodí přímo na tvůj účet a necháváš si je celé."
          />
        

        
          <div className="grid gap-8 rounded-[20px] border border-border bg-card p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:p-10">
            <div>
              <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <p className="text-5xl font-semibold tracking-[-0.045em] tabular-nums sm:text-6xl">
                    0 Kč
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    měsíčně
                  </p>
                </div>
                <div>
                  <p className="text-5xl font-semibold tracking-[-0.045em] tabular-nums text-coffee sm:text-6xl">
                    0 %
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    z uhrazených záloh
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                Účet, veřejná stránka i všechny funkce. Bez karty a bez
                závazků. Zálohy jdou QR platbou přímo na tvůj účet.
              </p>
              <Button asChild size="lg" className="mt-6">
                <Link href="/login">Začít zdarma</Link>
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Bez karty. Bez závazků.
              </p>
            </div>

            <div className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
              <p className="text-sm font-semibold">Co je v ceně</p>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 shrink-0 text-coffee" />
                    {item}
                  </li>
                ))}
              </ul>
              <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Záloha 1 000 Kč</dt>
                  <dd className="font-medium tabular-nums">celá tvoje</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Klient nezaplatí</dt>
                  <dd className="font-medium tabular-nums">0 Kč</dd>
                </div>
              </dl>
            </div>
          </div>
        
      </Container>
    </section>
  );
}
