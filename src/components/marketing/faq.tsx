import { Plus } from "lucide-react";
import { Container, SectionHeading } from "./section";

const FAQS = [
  {
    question: "Musím mít vlastní web?",
    answer:
      "Ne. Stačí odkaz na tvůj Tattly profil — vložíš ho do Instagram bio nebo pošleš klientovi. Rezervace, screening i platba proběhnou na jedné stránce.",
  },
  {
    question: "Co když klient zálohu nezaplatí?",
    answer:
      "Termín se po 24 hodinách automaticky uvolní a může si ho vzít někdo jiný. V kalendáři ti nezůstane blokovaný čas, o který jsi přišel.",
  },
  {
    question: "Kde skončí peníze ze zálohy?",
    answer:
      "Přímo na tvůj účet QR platbou – standard, který umí všechny české bankovní aplikace. Tattly peníze nezprostředkovává a teď si nebere nic.",
  },
  {
    question: "Jak se propojí Google kalendář?",
    answer:
      "Přihlásíš se přes Google a odsouhlasíš přístup. Volné termíny čteme z tvého kalendáře a potvrzená sezení do něj zapisujeme — obousměrně a hned.",
  },
  {
    question: "Můžu rezervaci přesunout nebo zrušit?",
    answer:
      "Ano, přímo v přehledu. Klient dostane e-mail s novým termínem nebo stornem a kalendář se sám zaktualizuje.",
  },
  {
    question: "Kolik mě to reálně stojí?",
    answer:
      "Teď úplně zdarma – žádný paušál ani provize. Zálohy chodí přímo na tvůj účet, takže si je necháváš celé.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border">
      <Container className="py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          
            <SectionHeading
              eyebrow="Časté otázky"
              title="Na co se lidi ptají."
            />
          
          
            <div className="divide-y divide-border border-y border-border">
              {FAQS.map((faq) => (
                <details key={faq.question} name="faq" className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <Plus className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          
        </div>
      </Container>
    </section>
  );
}
