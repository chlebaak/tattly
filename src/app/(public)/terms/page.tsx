import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Podmínky užití – Tattly",
  description:
    "Podmínky používání platformy Tattly pro rezervace, zálohy a platby.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="text-xs font-medium text-muted-foreground">Tattly.eu</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight">
        Podmínky užití
      </h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:tracking-tight [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1">
        <p>
          Provozovatelem platformy Tattly (dále „platforma“) je [PROVOZOVATEL],
          IČO [IČO], se sídlem [ADRESA], kontakt [KONTAKTNÍ E-MAIL].
        </p>

        <section>
          <h2>1. Co platforma je</h2>
          <p>
            Platforma zprostředkovává poptávky a rezervace mezi klienty
            a profesionály (tatéři, trenéři apod.). Platforma není stranou
            smlouvy o poskytnutí samotné služby – tu uzavírá klient přímo
            s profesionálem.
          </p>
        </section>

        <section>
          <h2>2. Rezervace a zálohy</h2>
          <ul>
            <li>
              odesláním poptávky rezervace nevzniká; profesionál poptávku
              posuzuje a může ji odmítnout,
            </li>
            <li>
              termín je potvrzen až schválením profesionálem a – je-li
              vyžadována – úhradou zálohy ve stanovené lhůtě,
            </li>
            <li>
              není-li záloha uhrazena včas, termín se automaticky uvolní,
            </li>
            <li>záloha se odečítá z výsledné ceny služby.</li>
          </ul>
        </section>

        <section>
          <h2>3. Storno podmínky</h2>
          <p>
            Storno podmínky (lhůty a pravidla pro vrácení zálohy) stanovuje
            profesionál a jsou uvedeny v komunikaci k rezervaci. Při
            neomluvené absenci může záloha propadnout. Platby kartou se vrací
            zpět na kartu, QR platby vrací profesionál bankovním převodem.
          </p>
        </section>

        <section>
          <h2>4. Platby</h2>
          <p>
            Platby kartou zpracovává Stripe. QR platby směřují přímo na
            bankovní účet profesionála a platforma je nijak nezprostředkovává.
          </p>
        </section>

        <section>
          <h2>5. Odpovědnost</h2>
          <p>
            Platforma odpovídá za provoz technického řešení a zpracování
            rezervací, neodpovídá však za průběh, kvalitu ani výsledek služeb
            poskytovaných profesionálem.
          </p>
        </section>

        <section>
          <h2>6. Změny podmínek</h2>
          <p>
            Podmínky můžeme přiměřeně měnit; o podstatných změnách budeme
            uživatele informovat e-mailem nebo v aplikaci.
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/privacy">Ochrana osobních údajů</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Zpět na Tattly.eu</Link>
        </Button>
      </div>
    </main>
  );
}
