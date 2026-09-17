import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů – Tattly",
  description:
    "Jaké osobní údaje Tattly zpracovává, za jakým účelem a jaká jsou vaše práva.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="text-xs font-medium text-muted-foreground">Tattly.eu</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight">
        Ochrana osobních údajů
      </h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:tracking-tight [&_h3]:font-medium [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1">
        <p>
          Správcem osobních údajů je [PROVOZOVATEL], IČO [IČO], se sídlem
          [ADRESA]. Ve věcech ochrany údajů nás kontaktujte na [KONTAKTNÍ
          E-MAIL].
        </p>

        <section>
          <h2>1. Jaké údaje zpracováváme</h2>
          <h3 className="mt-3">Klienti</h3>
          <ul>
            <li>jméno, e-mail a telefon,</li>
            <li>obsah poptávky a odpovědi na dotazník profesionála,</li>
            <li>referenční fotografie nahrané k poptávce,</li>
            <li>údaje o rezervaci a souvisejících platbách.</li>
          </ul>
          <h3 className="mt-3">Profesionálové</h3>
          <ul>
            <li>jméno, e-mail a profilové údaje (včetně adresy a živnostenských údajů),</li>
            <li>šifrovaný přístupový token pro propojení Google kalendáře,</li>
            <li>identifikátor platebního účtu u Stripe.</li>
          </ul>
        </section>

        <section>
          <h2>2. Účel a právní základ</h2>
          <ul>
            <li>
              vyřízení rezervace a vzájemná komunikace – plnění smlouvy,
            </li>
            <li>
              zpracování záloh a fakturace – plnění smlouvy a zákonné
              povinnosti,
            </li>
            <li>
              údaje citlivé povahy (zdravotní informace v dotazníku) – na
              základě vašeho výslovného souhlasu, který můžete kdykoli odvolat,
            </li>
            <li>provoz a zabezpečení služby – oprávněný zájem.</li>
          </ul>
        </section>

        <section>
          <h2>3. Komu údaje předáváme</h2>
          <p>
            Údaje předáváme pouze zpracovatelům nezbytným pro provoz služby:
            Stripe (platby), Google (kalendář), Resend (e-maily), Cloudflare
            (úložiště souborů), Neon (databáze), Vercel (hosting) a Mapy.cz
            (našeptávač adres). Údaje nepředáváme pro marketingové účely třetích
            stran.
          </p>
        </section>

        <section>
          <h2>4. Doba uchování</h2>
          <p>
            Údaje uchováváme po dobu existence vašeho účtu či rezervace a dále
            po dobu vyžadovanou právními předpisy (zejména pro účetní
            doklady). Fotografie a odpovědi dotazníku mažeme na vyžádání.
          </p>
        </section>

        <section>
          <h2>5. Vaše práva</h2>
          <p>
            Máte právo na přístup ke svým údajům, jejich opravu a výmaz,
            omezení zpracování a přenositelnost, právo odvolat souhlas a právo
            podat stížnost u Úřadu pro ochranu osobních údajů. S žádostí se na
            nás obraťte na [KONTAKTNÍ E-MAIL].
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/terms">Podmínky užití</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Zpět na Tattly.eu</Link>
        </Button>
      </div>
    </main>
  );
}
