import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů",
  description:
    "Jaké osobní údaje Tattly zpracovává, za jakým účelem, jak dlouho a jaká jsou vaše práva.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="text-xs font-medium text-muted-foreground">Tattly.eu</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
        Ochrana osobních údajů
      </h1>
      <p className="mt-3 text-xs text-muted-foreground">
        Účinné od [DATUM ÚČINNOSTI]. Nahrazuje předchozí znění.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-3 [&_h3]:font-medium [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1">
        <p>
          Správcem osobních údajů je <strong>[PROVOZOVATEL]</strong>, IČO
          [IČO], se sídlem [ADRESA]. Ve věcech ochrany osobních údajů nás
          kontaktujte na <strong>[KONTAKTNÍ E-MAIL]</strong>. Jmenovaný
          kontakt slouží i pro uplatnění vašich práv.
        </p>

        <section>
          <h2>1. Jaké údaje zpracováváme</h2>
          <h3>Klienti (osoby, které si rezervují termín)</h3>
          <ul>
            <li>
              jméno, e-mail, telefon a údaje vyplněné v poptávce nebo dotazníku
              profesionála (může jít i o údaje o zdravotním stavu, tetování,
              alergiích apod.),
            </li>
            <li>referenční fotografie, které k poptávce nahrajete,</li>
            <li>
              údaje o rezervaci: zvolená služba, termín, stav rezervace, výše a
              stav zálohy, číslo účtu uvedené pro případ vrácení zálohy.
            </li>
          </ul>
          <h3>Profesionálové (tatéři, trenéři a další)</h3>
          <ul>
            <li>
              jméno, e-mail, přihlašovací účet Google, profilové a fakturační
              údaje (adresa, studio, IČO, DIČ, bankovní účet), specializace a
              fotografie portfolia,
            </li>
            <li>
              šifrovaný přístupový token pro propojení Google kalendáře a
              token pro čtení pohybů na účtu (pouze pokud si je sami zapnete),
            </li>
            <li>nastavení služeb, pracovní doby a rezervačních pravidel.</li>
          </ul>
          <p className="mt-3">
            Údaje získáváme přímo od vás (vyplněním formuláře, přihlášením přes
            Google), případně od profesionála, u kterého si rezervujete. Údaje
            nepředáváme pro marketingové účely třetích stran a nepoužíváme je k
            profilování ani k automatizovanému rozhodování.
          </p>
        </section>

        <section>
          <h2>2. Účel a právní základ</h2>
          <ul>
            <li>
              <strong>Vyřízení rezervace a komunikace</strong> (předání poptávky
              profesionálovi, potvrzení, připomínky, změny termínu) – plnění
              smlouvy.
            </li>
            <li>
              <strong>Zálohy, fakturace a účetnictví</strong> – plnění smlouvy
              a plnění zákonných povinností.
            </li>
            <li>
              <strong>Citlivé údaje</strong> (například zdravotní informace v
              dotazníku nebo na referenčních fotkách) – výslovný souhlas, který
              můžete kdykoli odvolat; bez něj vám rezervaci s dotazníkem
              nemůžeme předat.
            </li>
            <li>
              <strong>Provoz, bezpečnost a obrana proti zneužití</strong>{" "}
              (ochrana proti spamu, technické logy) – oprávněný zájem.
            </li>
            <li>
              <strong>Newslettery a novinky</strong> – pouze pokud nám k tomu
              dáte souhlas; odhlásit se lze v každém e-mailu.
            </li>
          </ul>
          <p className="mt-3">
            Údaje jsou nezbytné pro uzavření a plnění smlouvy. Pokud je
            neposkytnete, rezervaci nelze vytvořit ani vyřídit.
          </p>
        </section>

        <section>
          <h2>3. Komu údaje předáváme</h2>
          <p>
            Vaše údaje předáváme <strong>profesionálovi</strong>, u kterého si
            rezervujete – bez toho by rezervace nemohla vzniknout. Dále
            využíváme zpracovatele, kteří pro nás zajišťují provoz:
          </p>
          <ul>
            <li>
              <strong>Google Ireland Limited</strong> – přihlášení a
              synchronizace kalendáře (předáváme jméno, e-mail a údaje o
              potvrzeném termínu),
            </li>
            <li>
              <strong>Resend</strong> – odesílání e-mailů (jméno, e-mail a obsah
              zprávy),
            </li>
            <li>
              <strong>Cloudflare</strong> – úložiště nahraných fotografií,
            </li>
            <li>
              <strong>Neon</strong> – databáze, <strong>Vercel</strong> –
              hosting aplikace,
            </li>
            <li>
              <strong>Mapy.cz (Seznam.cz)</strong> – našeptávač adres a měst.
            </li>
          </ul>
          <p className="mt-3">
            Někteří z těchto zpracovatelů působí v <strong>USA</strong>, proto
            předání probíhá na základě standardních smluvních doložek podle
            čl. 46 GDPR a u společností zapojených do{" "}
            <strong>rámce EU–USA pro ochranu osobních údajů</strong> (Data
            Privacy Framework) také podle rozhodnutí o odpovídající ochraně.
          </p>
        </section>

        <section>
          <h2>4. Doba uchování</h2>
          <ul>
            <li>
              <strong>Rezervace, poptávky a komunikace</strong> – po dobu
              vyřízení a dále 3 roky od poslední aktivity (kvůli možné
              reklamaci a promlčení),
            </li>
            <li>
              <strong>Účetní doklady a fakturační údaje</strong> – 5 let od
              konce účetního období, ve kterém vznikly (případně 10 let, jste-li
              plátcem DPH),
            </li>
            <li>
              <strong>Referenční fotografie a odpovědi z dotazníku</strong> – po
              dobu vyřízení rezervace; po jejím ukončení je automaticky mažeme
              (do 14 dnů u odmítnuté, zrušené nebo vypršelé rezervace, do 30 dnů
              u splněné), nejpozději však <strong>12 měsíců</strong> od
              vytvoření rezervace. Na požádání je smažeme i dříve,
            </li>
            <li>
              <strong>Údaje o účtu profesionála</strong> – po dobu existence
              účtu, poté 3 roky (kvůli účetním a smluvním povinnostem).
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Vaše práva</h2>
          <p>
            Máte právo na přístup ke svým údajům, jejich opravu a výmaz, na
            omezení zpracování, na přenositelnost údajů a právo vznést námitku
            proti zpracování na základě oprávněného zájmu. Souhlas se
            zpracováním citlivých údajů můžete kdykoli odvolat – to se týká
            budoucího zpracování, nikoli zpracování provedeného do odvolání.
          </p>
          <p className="mt-3">
            S žádostí se obraťte na <strong>[KONTAKTNÍ E-MAIL]</strong>;
            vyřídíme ji nejpozději do jednoho měsíce. Dozvíte-li se, že s
            údaji nakládáme v rozporu se zákonem, můžete se obrátit i na{" "}
            <strong>Úřad pro ochranu osobních údajů</strong>, Pplk. Sochora 27,
            170 00 Praha 7 (uoou.cz), případně se domáhat svých práv u soudu.
          </p>
        </section>

        <section>
          <h2>6. Soubory cookie</h2>
          <p>
            Používáme pouze technicky nezbytné soubory cookie (přihlášení a
            ochrana proti zneužití formulářů). Žádné analytické ani reklamní
            cookies nenasazujeme, proto se nezobrazuje ani lišta se souhlasem.
            Cookies můžete kdykoli smazat v nastavení prohlížeče; přihlášení
            pak nebude fungovat.
          </p>
        </section>

        <section>
          <h2>7. Zabezpečení</h2>
          <p>
            Veškerá komunikace je šifrovaná (HTTPS). Přístupové tokeny k
            externím službám ukládáme v šifrované podobě, k databázi mají
            přístup jen oprávnění pracovníci a přístupy jsou chráněny silnými
            přihlašovacími údaji. Fotografie jsou dostupné pouze přes
            časově omezené podepsané odkazy nebo přes ověřený přístup.
          </p>
        </section>

        <section>
          <h2>8. Děti</h2>
          <p>
            Služba je určena osobám starším 15 let. Pokud je vám méně,
            rezervujte prosím jen se souhlasem zákonného zástupce. Profesionál
            může u tetování vyžadovat i vyšší věk nebo souhlas zástupce.
          </p>
        </section>

        <section>
          <h2>9. Změny tohoto dokumentu</h2>
          <p>
            Znění můžeme přiměřeně aktualizovat podle toho, jak se služba vyvíjí.
            O podstatných změnách informujeme e-mailem nebo v aplikaci a vždy
            uvedeme datum účinnosti. Aktuální znění je vždy dostupné na této
            stránce.
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
