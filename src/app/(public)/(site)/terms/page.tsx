import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Podmínky užití",
  description:
    "Podmínky používání platformy Tattly: rezervace, zálohy, storno, odpovědnost a řešení sporů.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="text-xs font-medium text-muted-foreground">Tattly.eu</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
        Podmínky užití
      </h1>
      <p className="mt-3 text-xs text-muted-foreground">
        Účinné od [DATUM ÚČINNOSTI]. Nahrazuje předchozí znění.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1">
        <p>
          Provozovatelem platformy Tattly (dále „platforma“) je{" "}
          <strong>[PROVOZOVATEL]</strong>, IČO [IČO], se sídlem [ADRESA],
          kontakt <strong>[KONTAKTNÍ E-MAIL]</strong>. Používáním platformy
          souhlasíte s těmito podmínkami.
        </p>

        <section>
          <h2>1. Co platforma je a jaké má role</h2>
          <p>
            Platforma je <strong>technický nástroj</strong>, který profesionálům
            (tatérům, trenérům a dalším) umožňuje přijímat a spravovat
            rezervace a klientům si termín vybrat a zaplatit zálohu.
          </p>
          <ul>
            <li>
              Smlouvu o poskytnutí samotné služby (tetování, trénink…) uzavírá
              klient <strong>přímo s profesionálem</strong>. Platforma není
              stranou této smlouvy, neodpovídá za její obsah ani za kvalitu
              služby.
            </li>
            <li>
              Profesionál je ve vztahu ke svým klientům podnikatelem a nese
              odpovědnost za řádné poskytnutí služby, za cenu i za plnění
              informačních povinností podle zákona o ochraně spotřebitele.
            </li>
            <li>
              Provoz platformy je pro profesionály i klienty{" "}
              <strong>zdarma</strong>; platforma si neúčtuje provizi ze záloh
              ani jiné poplatky.
            </li>
          </ul>
        </section>

        <section>
          <h2>2. Rezervace a zálohy</h2>
          <ul>
            <li>
              odesláním poptávky rezervace nevzniká – profesionál poptávku
              posuzuje a může ji přijmout nebo odmítnout,
            </li>
            <li>
              termín je potvrzen až schválením profesionálem a – je-li
              vyžadována – úhradou zálohy ve stanovené lhůtě (obvykle 24 hodin),
            </li>
            <li>
              není-li záloha uhrazena včas, termín se automaticky uvolní a
              rezervace vyprší,
            </li>
            <li>
              záloha se odečítá z výsledné ceny služby; nejde o poplatek navíc,
            </li>
            <li>
              zálohu hradí klient přímo profesionálovi, platforma peníze
              nepřijímá, nedrží ani nepřeposílá.
            </li>
          </ul>
        </section>

        <section>
          <h2>3. Storno a odstoupení od smlouvy</h2>
          <p>
            Storno podmínky (lhůty, výše případně nevratné části zálohy) stanovuje
            profesionál a musí být uvedeny v komunikaci k rezervaci nebo ve
            veřejném profilu. Při neomluvené absenci může záloha propadnout.
            Vrácení záloh provádí profesionál bankovním převodem na účet, který
            klient uvede na stránce stavu rezervace.
          </p>
          <p className="mt-3">
            Jste-li spotřebitel, jste oprávněni odstoupit od smlouvy uzavřené na
            dálku ve 14denní lhůtě (§ 1829 občanského zákoníku). U smlouvy
            o poskytnutí služby v <strong>předem určeném termínu</strong> nebo po
            jejím úplném splnění s vaším výslovným souhlasem však právo na
            odstoupení nevzniká (§ 1837 občanského zákoníku). Konkrétní postup a
            lhůty najdete v podmínkách profesionála.
          </p>
        </section>

        <section>
          <h2>4. Platby</h2>
          <p>
            Zálohy se platí <strong>QR platbou přímo na bankovní účet
            profesionála</strong>. Platforma platby nezprostředkovává, nepřijímá
            je na svůj účet ani z nich nebere podíl. Údaje o zaplacení (částka,
            variabilní symbol, datum) evidujeme pouze proto, abychom klientovi
            i profesionálovi ukázali stav rezervace. Vyúčtování služby a
            případné doklady vystavuje profesionál.
          </p>
        </section>

        <section>
          <h2>5. Obsah, který vkládáte</h2>
          <ul>
            <li>
              vkládáním fotografií a textů potvrzujete, že k nim máte práva nebo
              souhlas osob na nich zobrazených,
            </li>
            <li>
              nahrané referenční fotografie zpracováváme jen pro účel vyřízení
              rezervace; profesionál je uvidí u své poptávky a může je použít
              k přípravě návrhu,
            </li>
            <li>
              profesionál se zavazuje nevkládat fotografie z portfolia ani jiný obsah
              odporující zákonu nebo dobrým mravům,
            </li>
            <li>
              neoprávněný obsah na základě oznámení odstraníme a účet můžeme
              zablokovat.
            </li>
          </ul>
        </section>

        <section>
          <h2>6. Odpovědnost a dostupnost</h2>
          <p>
            Platformu provozujeme s péčí řádného hospodáře, poskytujeme ji však
            „tak, jak je“. Nezaručujeme nepřetržitou dostupnost – službu můžeme
            omezit kvůli údržbě, aktualizacím nebo výpadkům u dodavatelů
            (hosting, databáze, e-mailová služba). Za nepřímé škody, ušlý zisk
            nebo škodu způsobenou výpadkem neodpovídáme v rozsahu, který
            připouští zákon. Odpovědnost za samotný průběh a výsledek služby
            nese profesionál.
          </p>
        </section>

        <section>
          <h2>7. Účet a jeho ukončení</h2>
          <p>
            Účet profesionála lze kdykoli ukončit – napište nám na
            [KONTAKTNÍ E-MAIL] a účet včetně profilu a portfolia smažeme.
            Údaje o proběhlých rezervacích a účetní doklady uchováváme po dobu
            uvedenou v zásadách ochrany osobních údajů. Klient může požádat o
            výmaz svých údajů stejnou cestou.
          </p>
        </section>

        <section>
          <h2>8. Reklamace a mimosoudní řešení sporů</h2>
          <p>
            S reklamací týkající se <strong>služby samotné</strong> se obraťte
            přímo na profesionála. S reklamací <strong>platformy</strong> se
            obraťte na [KONTAKTNÍ E-MAIL]; odpovíme nejpozději do 30 dnů.
          </p>
          <p className="mt-3">
            Jste-li spotřebitel, máte právo na mimosoudní řešení sporu s
            profesionálem i s provozovatelem platformy. Obrátit se můžete na{" "}
            <strong>Českou obchodní inspekci</strong>, Štěpánská 796/44, 110 00
            Praha 1 (coi.cz), která je orgánem mimosoudního řešení spotřebitelských
            sporů, případně na jiný pověřený subjekt. Řešení sporů je možné i
            soudně.
          </p>
        </section>

        <section>
          <h2>9. Změny podmínek</h2>
          <p>
            Podmínky můžeme přiměřeně měnit, zejména když se změní funkce
            platformy nebo právní předpisy. O podstatných změnách informujeme
            e-mailem nebo v aplikaci nejméně 14 dní předem. Pokud změny
            nepřijímáte, můžete účet ukončit; dalším používáním platformy
            vyjadřujete souhlas.
          </p>
        </section>

        <section>
          <h2>10. Rozhodné právo</h2>
          <p>
            Vztahy se řídí právem <strong>České republiky</strong>. Ustanovení
            těchto podmínek se nesmí dotknout práv, která vám jako spotřebiteli
            zaručuje zákon; je-li některé ustanovení neplatné, ostatní zůstávají
            v platnosti.
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
