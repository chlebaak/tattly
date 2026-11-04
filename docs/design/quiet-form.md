# Quiet Form — redesign Tattly.eu

Stav: implementováno (Quiet Form)
Datum: 2026-11-04

> Implementační poznámky: Rezervace je samostatná stránka, KPI pás z Přehledu byl odstraněn. Volné starty v kalendáři jsou collapsible panel (ne sheet), služby se editují inline a nastavení ukládají po sekcích. Statistiky používají 24 sloupců pro hodiny. Mobilní Nastavení je v avatar menu.
Rozsah: veřejný web, dashboard, veřejné stránky tatérů, booking flow
Mimo rozsah: platební logika, e-maily, databázové schema, dark mode

---

## 1. Cíl

Tattly má působit jako **klidný, přesný a prémiový nástroj**, ne jako přehlídka karet.
Hlavní cíl je použitelnost: každá obrazovka má jedno hlavní sdělení a jednu jasnou další akci.
Vizuální styl je moderní, clean a sleek. Ne minimalismus pro minimalismus — **klidný, ale ne prázdný**.

### Úspěch znamená

- Umím za 5 sekund říct, co mě dnes čeká a co musím udělat.
- Dashboard není skládačka rovnocenných widgetů; má zřetelnou hierarchii.
- Na první pohled poznám, co je akce, co je informace a co je historie.
- Na mobilu se nic nepřetéká a hlavní akce jsou dosažitelné palcem.
- Veřejný web prodává produkt bez fake čísel, fake recenzí a bez „AI estetiky“.
- Celý web drží jeden jazyk: barvy, typografie, spacing, tvary, motion.

### Co zůstává

- Produktová logika, rezervační engine, platby, e-maily, právní texty.
- Voice: landing tyká, aplikace a klientské stránky vykají, „tatér“ v klientské cestě.
- Ceny: 0 Kč / 0 %, zálohy jdou přímo tatérovi.
- Bez bufferu mezi sezeními; rozestup startů řeší `resolveSlotInterval`.

---

## 2. Principy Quiet Form

1. **Jedna obrazovka = jeden úkol.**
   Přehled odpovídá „Co teď?“, Kalendář „Kdy?“, Rezervace „Kdo?“, Statistiky „Jak se mi daří?“.
2. **Jedna dominantní věc.**
   Na Přehledu to je nejbližší termín a fronta akcí. Všechno ostatní je menší, tišší, dál.
3. **Progresivní odhalování.**
   Nejdřív akce, pak kontext, pak historie. Detail je vždy jeden klik.
4. **Hierarchie typem a prostorem, ne boxy.**
   Karty jen pro skutečné objekty (termín, služba, tatér). Sekce oddělujeme linkou a prostorem.
5. **Barva jen jako význam.**
   Espresso = primární/aktivní, coffee = odkazy, crema = highlighty, zelená = hotovo, jantar = čekání, cihlová = pozornost. Zbytek inkoust a neutrály.
6. **Žádný glassmorphism.**
   Žádné blur podkladu, průhledné panely, gradienty ani dekorativní blob. Polish vzniká typografií, zarovnáním, spacingem a klidem.
7. **Pohyb jen tam, kde vysvětluje změnu.**
   150–220 ms, ease-out, respektovat `prefers-reduced-motion`.

---

## 3. Vizuální systém

### 3.1 Paleta

| Token | Hodnota | Použití |
|---|---|---|
| `--background` | `#F6F5F1` | plocha aplikace, jemný teplý paper |
| `--surface` | `#FFFFFF` | karty, sheety, formulářové plochy |
| `--ink` | `#12110F` | hlavní text, ikony |
| `--muted` | `#6E6B64` | sekundární text, labely |
| `--line` | `rgb(59 42 32 / 12%)` | hairline linky |
| `--primary` | `#3B2A20` | espresso – primární akce, tmavé plochy |
| `--coffee` | `#6F4E37` | odkazy, menší textové akcenty |
| `--crema` | `#C89F7B` | highlighty, badge, sekundární graf |
| `--accent` | `#EFE6DE` | milk – selected plochy |
| `--status-ok` | `#276749` | hotovo, potvrzeno |
| `--status-ok-soft` | `#E8F2EC` | jemný success podklad |
| `--waiting` | `#8A5A12` | čekání na klienta |
| `--waiting-soft` | `#F6EEDD` | jemný podklad |
| `--attention` | `#B42318` | akce vyžadující pozornost |
| `--attention-soft` | `#F7E7E3` | jemný podklad |
| `--radius-panel` | `20px` | velké plochy |
| `--radius-control` | `10px` | tlačítka, inputy |
| `--shadow-float` | `0 18px 50px -24px rgb(0 0 0 / 0.25)` | jen sheety a menus |

Pravidla:
- Primární akce = espresso. Coffee = odkazy, crema = highlighty. Nikdy dvě tmavé akcentní plochy v jedné sekci.
- Červená/cihlová jen pro skutečný problém nebo destruktivní akci.
- Jantar jen pro „čeká na klienta“, ne pro „čeká na mě“.
- Status nikdy není pouze barva; vždy tečka + text.

### 3.2 Typografie

- **Geist** (variable, 300–700) pro celý web i aplikaci. Czech latin-ext ověřeno.
- Fallback: **Host Grotesk**, pokud by Geist v `next/font/google` zlobil.
- Žádný serif. Žádný mono jako dekorace. Čísla a časy mají `font-variant-numeric: tabular-nums`.
- Škála:
  - Display / hero: 56–72 px, 600, tracking −0.04em, line-height 0.98–1.05.
  - H1 stránky: 32–40 px, 600, tracking −0.03em.
  - H2 sekce: 22–26 px, 600, tracking −0.02em.
  - Tělo: 16–17 px, 400, line-height 1.55.
  - Malý text: 13 px, 400, line-height 1.45.
  - Label / eyebrow: 12 px, 500, tracking 0.08em, uppercase jen výjimečně.
  - Čísla: tabulková, u peněz a časů vždy.

### 3.3 Plochy a komponenty

- App canvas je paper; obsahové plochy jsou bílé.
- Velké plochy: 20 px radius, 1 px hairline, žádný stín.
- Tlačítka a inputy: 10 px radius, výška 40 px na desktopu, 44 px na mobilu.
- Primární tlačítko: espresso fill, bílý text. Sekundární: bílá plocha, hairline, ink text. Ghost: text.
- Inputy: bílá plocha, hairline, focus = 2 px coffee ring s offsetem.
- Řádky seznamů: 56–64 px, oddělené hairline, hover jemný paper.
- Karty používáme jen pro: nejbližší termín, službu, tatéra, formulářovou plochu. Ne pro každou sekci.
- Ikony: 18 px, tenká linka, monochrom. Žádné ikony v kroužcích, pokud to není nezbytné.
- Status: tečka + text. Pilulka jen v hlavičce detailu, kde pomáhá orientaci.
- Prázdný stav: jedna věta + jedna akce. Žádná velká ilustrace.
- Skeleton: kopíruje finální layout, žádný generický spinner.

### 3.4 Layout

- Desktop: sidebar 232 px, obsah max 1120 px, 12sloupcová mřížka, gutter 24 px, page padding 32–40 px.
- Tablet: sidebar se schová, obsah max 960 px, 24 px gutter.
- Mobil: 16 px gutter, spodní tab bar, sheety na plnou výšku.
- Veškeré interaktivní prvky min. 44 px na dotyk.
- Žádný horizontální scroll; tabulky se na mobilu mění na karty.

### 3.5 Motion

- Vstupy sekcí: fade + 8–12 px translate, 400–500 ms, jednou.
- Změny stavu: 150–200 ms ease-out.
- Modaly/sheety: 200–240 ms, bez bounce.
- `prefers-reduced-motion`: všechny animace vypnuté.
- Žádný parallax, žádné auto-playing carously, žádné confetti.

---

## 4. Navigace a IA

### 4.1 Desktop

Sidebar 232 px, papírová plocha, hairline vpravo:

- Nahoře: wordmark Tattly.
- Primární navigace:
  - Přehled
  - Kalendář
  - Rezervace
  - Statistiky
- Dole:
  - Nastavení
  - Veřejný profil
  - Uživatel (avatar, jméno, menu)

Pravidla:
- Aktivní položka: jemný milk podklad + espresso text, žádný výrazný pruh.
- Počet akcí k vyřízení: malá tečka/číslo u Přehledu, ne červená pilulka.
- Žádné skupinové labely „Rezervace“ / „Nastavení“; hlavní navigace je krátká.
- Nastavení je jedna položka; jednotlivé sekce mají vlastní sub-navigaci.

### 4.2 Mobil

- Nahoře tenký header: wordmark vlevo, avatar vpravo. Obsah má vlastní H1.
- Spodní tab bar: Přehled, Kalendář, Rezervace, Statistiky.
- Nastavení a Veřejný profil jsou v avatar menu.
- Aktivní tab: ink text + coffee tečka; neaktivní: muted.
- Počet akcí: malá tečka u Přehledu.

### 4.3 Nastavení

- `/dashboard/settings` je hub: seznam 5 řádků (Profil, Služby, Dostupnost, Platby, Integrace), ne mřížka karet.
- Uvnitř každé sekce je horizontální sub-navigace s podtrženým aktivním stavem.
- Formuláře jsou jedna bílá plocha max 800 px, sekce oddělené hairline.
- Sticky save bar jen při neuložených změnách: „Uložit změny“ + „Zahodit“.
- Destruktivní akce v samostatné „Nebezpečné zóně“ dole.

---

## 5. Dashboard Přehled — jádro redesignu

### 5.1 Úkol obrazovky

Odpovědět na tři otázky v tomto pořadí:

1. **Co mě čeká?** → nejbližší potvrzený termín.
2. **Co musím udělat?** → fronta akcí.
3. **Jak vypadá den a peníze?** → dnešní rozvrh + peněžní přehled.

Všechno ostatní je o klik dál: Rezervace, Kalendář, Statistiky, Nastavení.

### 5.2 Co z Přehledu zmizí

- Čtyři KPI karty → nahrazeno jednou souhrnnou větou a peněžním pruhem.
- Samostatná sekce „Vyžaduje pozornost“ → sloučeno do fronty „Na vás čeká“.
- Karta „Peníze“ → nahrazena klidným peněžním pruhem bez boxu.
- „Rychlé akce“ → zrušeno; akce jsou tam, kde vznikají.
- „Dnes a zítra“ timeline → „Dnešní rozvrh“ s přepínačem Dnes/Zítra.
- Celý seznam rezervací → přesunut na samostatnou stránku Rezervace.
- `PublicLinkBar` nahoře → přesunut do sidebaru / avatar menu.
- Zvoníček v topbaru → zrušen; fronta je jediné místo, kde se něco děje.

Zůstávají jen onboarding a Google reconnect, ale jako tenké řádky, ne velké karty.

### 5.3 Desktop wireframe

```
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ Tattly       │  Úterý 4. listopadu                     [Sdílet profil]     │
│              │  Dobrý den, Jane.                                           │
│ Přehled  •2  │  Dnes máte 2 termíny. 1 poptávka čeká na vaše schválení.    │
│ Kalendář     │                                                             │
│ Rezervace    │  ┌───────────────────────────────┐   Na vás čeká      3     │
│ Statistiky   │  │ NEJBLIŽŠÍ TERMÍN   Potvrzeno  │   ● Nová poptávka          │
│              │  │ 14:00 – 16:00                 │     Petra K. · Realismus   │
│              │  │ Lucie Nováková                │                  [Schválit]│
│              │  │ Realismus · 2 h               │   ● Čeká na zálohu         │
│              │  │ Záloha 1 000 Kč · uhrazeno    │     Martin Š. · 1 000 Kč   │
│              │  │ [Detail] [Napsat]        ···  │                  [Detail]  │
│              │  └───────────────────────────────┘   ● Vratka               │
│              │                                       [Vyřešit]          │
│              │  Dnešní rozvrh       [Dnes | Zítra]   Zobrazit vše (3) →    │
│              │  09:00 ── Jan Novák · Blackwork                             │
│              │  14:00 ── Lucie Nováková · Realismus                        │
│              │                                                             │
│              │  Peníze                                    Statistiky →    │
│              │  Vyděláno 24 500 Kč · Očekávané 8 000 Kč · Nezaplaceno 1 000 Kč
│              │                                                             │
│              │  Všechny rezervace →                                        │
│ Nastavení    │                                                             │
│ Profil       │                                                             │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

Vizuální pravidla:
- Jediná bílá karta v horní části je nejbližší termín. Fronta je seznam na papíře, ne karta.
- Peníze jsou jeden pruh s hairline linkou, ne karta.
- Když je fronta prázdná, zůstane jen klidná věta „Vše vyřízeno“ a prostor dostane termín.
- Když je fronta plná, je první věc, kterou oko vidí (espresso/cihlová tečka + akce), ale termín zůstává kotvou.

### 5.4 Header

- Eyebrow: `Úterý 4. listopadu` (13 px, muted).
- H1: `Dobrý den, Jane.` (32–36 px, 600).
- Souhrnná věta (16 px):
  - Prioritně akce: „1 poptávka čeká na vaše schválení. Dnes máte 2 termíny.“
  - Bez akcí: „Dnes máte 2 termíny. Vše ostatní je vyřízené.“
  - Prázdný den: „Dnes žádné termíny. Vše je vyřízené.“
- Vpravo jen jedna tichá akce: „Sdílet profil“ (ikona + text), na mobilu v avatar menu.

### 5.5 Nejbližší termín (kotva)

Obsah:
- Label `NEJBLIŽŠÍ TERMÍN`, vpravo status `Potvrzeno` (tečka + text).
- Čas `14:00` 64 px, `– 16:00` 20 px muted. Pokud je to dnes, nahoře malé `Dnes`.
- Klient `Lucie Nováková` 24 px, služba `Realismus · 2 h` 14 px muted.
- Max 2 meta informace: `Záloha 1 000 Kč · uhrazeno`, `Google kalendář`.
- Akce: primární `Detail termínu` (espresso), sekundární `Napsat` (outline), overflow `Přesunout`, `Zrušit`.
- Pokud začíná do 2 h: jemná věta `Za 2 h 15 min`. Pokud právě probíhá: `Právě probíhá`.

Stavy:
- Žádný potvrzený termín dnes, ale zítra: `Dnes už nic. Zítra v 10:00.` + `Otevřít kalendář`.
- Žádný budoucí termín: `Zatím žádný naplánovaný termín.` + `Sdílet profil`.
- Neúplné nastavení: `Nejdřív nastavte dostupnost.` + `Dokončit nastavení`.

### 5.6 Fronta „Na vás čeká“

Fronta obsahuje **jen věci, které má udělat tatér**. Ne „čeká na klienta“.

Typy položek:
- `Nová poptávka` (pending_review) → `Schválit`.
- `Zpráva od klienta` (openRequest) → `Odpovědět`.
- `Klient hlásí platbu` (deposit_pending + clientPaidAt) → `Potvrdit platbu`.
- `Vratka` (cancelled + succeeded payment) → `Vyřešit`.
- `Nespárovaná platba` (bank transaction) → `Přiřadit`.

Pravidla:
- Max 3 položky, pak `Zobrazit vše (N) →`.
- Každá položka: typ (malý label), hlavní řádek (klient/částka), kontext (služba/termín), jedna akce vpravo.
- Řádky oddělené hairline, žádné boxy.
- Celý řádek jde otevřít do detailu; akční tlačítko je samostatné.
- `deposit_pending` bez `clientPaidAt` se ve frontě neobjevuje; je to „čeká na klienta“ a patří do Rezervací.
- Počet v sidebaru = počet skutečných akcí, ne všech pending rezervací.

### 5.7 Dnešní rozvrh

- Heading + segmented control `Dnes | Zítra`.
- Řádky: čas (tabular), klient, služba, status tečka, chevron.
- Bez boxů; jen hairline mezi řádky a jemná vertikální linka u času.
- Nejbližší termín je v seznamu zvýrazněný coffee tečkou, ale ne duplicitně jako karta.
- Prázdný stav: `Dnes nemáte žádné termíny.` + `Otevřít kalendář`.
- Pokud je zítra něco a dnes nic: `Dnes volno. Zítra máte 1 termín.` + přepínač.

### 5.8 Peníze

Jeden pruh, žádná karta:
- `Vyděláno` — dokončená sezení v tomto měsíci, velké číslo 28–32 px.
- `Očekávané` — potvrzené budoucí termíny, 20 px.
- `Nezaplaceno` — nezaplacené zálohy, 20 px; při > 0 cihlová.
- Vpravo `Statistiky →`.
- Definice musí být stejné jako na stránce Statistiky, aby se čísla nerozcházela.

### 5.9 Mobilní Přehled

```
[logo]                         [avatar]
Úterý 4. listopadu
Dobrý den, Jane.
Dnes máte 2 termíny. 1 poptávka čeká.

┌ Nejbližší termín ──────────┐
│ 14:00 – 16:00   Potvrzeno  │
│ Lucie Nováková             │
│ Realismus · 2 h            │
│ Záloha 1 000 Kč · uhrazeno │
│ [Detail] [Napsat]     ···  │
└────────────────────────────┘

Na vás čeká               3
● Nová poptávka
  Petra K. · Realismus
                   [Schválit]
● Čeká na zálohu
  Martin Š. · 1 000 Kč
                   [Detail]
Zobrazit vše →

Dnešní rozvrh    [Dnes|Zítra]
09:00  Jan Novák
14:00  Lucie Nováková

Peníze           Statistiky →
Vyděláno 24 500 Kč
Očekávané 8 000 Kč
Nezaplaceno 1 000 Kč

[Přehled] [Kalendář] [Rezervace] [Statistiky]
```

### 5.10 Stavy Přehledu

- **Nový tatér:** jedna úvodní karta „Začínáme“ se 3 kroky (profil, služba + dostupnost, sdílet odkaz). Zbytek obrazovky je zklidněný, ne 5 prázdných boxů.
- **Načítání:** skeleton přesně podle 4 modulů; žádný generický spinner.
- **Chyba:** klidná chybová plocha s `Zkusit znovu`; zachovat sidebar.
- **Google odpojen:** tenký řádek pod headerem s `Připojit znovu`.
- **Onboarding neúplný:** tenký řádek `Dokončit nastavení (2/5) →`, ne velká karta.
- **Hodně akcí:** fronta ukáže 3 + `Zobrazit vše`; nikdy netlačí termín a rozvrh z obrazovky.
- **Žádná akce:** `Vše vyřízeno` + jedna věta; žádná prázdná karta.

---

## 6. Rezervace (nová stránka)

Proč: Přehled má být denní briefing, ne databáze. Plný seznam, hledání a filtry patří na vlastní místo.

- Route: `/dashboard/bookings`.
- Header: `Rezervace` + počet; žádná zbytečná primární akce.
- Filtry jako podtržené taby: `Ke zpracování`, `Na schválení`, `Na záloze`, `Potvrzené`, `Historie`, `Vše`.
- Hledání: jméno, e-mail, služba, popis. Diakritika-insensitive.
- Řazení: nejnovější / nejstarší / podle termínu.
- Desktop: tabulka s řádky 56–64 px:
  - Klient (jméno + e-mail), Termín, Služba, Stav, Částka, Akce.
  - Hover, klik otevře detail. Primární akce jen u položek, které ji mají.
- Mobil: karty se stejným obsahem, žádná tabulka.
- Hromadné schválení: při výběru se objeví spodní lišta `Vybráno 3 · Schválit vybrané`.
- Stránkování: `Zobrazit další` po 15.
- URL: `?filtr=...` zůstává, aby šly sdílet odkazy.
- Prázdný stav podle filtru, ne jeden generický.

### Detail rezervace (sheet)

- Hlavička: klient, status, služba, datum vytvoření, e-mail/telefon s kopírováním.
- `Co je potřeba`: jedna věta + primární akce.
- Klíčová fakta ve 2 sloupcích: termín, délka, cena, záloha, VS, Google kalendář.
- Reference: náhledy 72 px, lazy load, skeleton.
- Popis / dotazník: krátký citovaný blok.
- Komunikace: `Napsat klientovi` + poznámky.
- Timeline 4 kroků: Poptávka → Schválení → Záloha → Splněno.
- Sticky footer s primární akcí; destruktivní akce v overflow s potvrzením.

---

## 7. Kalendář

- Header: `Kalendář`, měsíc, `Dnes`, šipky.
- Desktop: 8 sloupců měsíční mřížka + 4 sloupce panel vybraného dne.
- Mřížka: hairline, žádné karty kolem dnů; dnešní den coffee, vybraný inkoustový kroužek.
- Rezervace: malé tečky/bary, ne texty v buňkách.
- Blokované dny: jemné šrafování nebo muted podklad.
- Panel dne: datum, agenda řádky, `Zablokovat den`, `Volné starty` jako tlačítko.
- `Volné starty pro klienta` v sheetu: výběr služby + časy; ne stálá karta na stránce.
- Mobil: mřížka nahoře, agenda pod ní; žádný boční panel.
- Legenda: max 4 položky, malá, dole.

---

## 8. Statistiky

- Header: `Statistiky` + segmented control období.
- Nahoře 4 primární KPI v pruhu, ne 8 karet:
  - Rezervace, Dokončené, Výdělek, Obsazenost.
  - Velké číslo, label, delta.
- Sekundární metriky v tabulce Peníze:
  - Přijaté zálohy, Vráceno, Očekávané, Nezaplacené zálohy, Průměr na rezervaci.
- Grafy:
  - Rezervace v čase — sloupce coffee.
  - Výdělek v čase — linie inkoust + jemná crema plocha.
  - Mix stavů — horizontální stacked bar, ne donut.
  - Top služby — rank bars.
  - Nejvytíženější dny — sloupce.
  - Nejvytíženější časy — 24dílný heat strip, ne 24 sloupců.
- Všechny grafy mají sr-only tabulku a textový popis.
- Mobil: 2×2 KPI, grafy pod sebou, labely jen první/prostřední/poslední.
- Prázdný stav: `Za toto období zatím žádná data.` + `Zpět na přehled`.

---

## 9. Nastavení

### Hub

- 5 řádků, hairline, ikona, název, popis, chevron.
- Onboarding checklist nahoře, jen pokud není hotový.
- Žádná mřížka karet.

### Služby

- Seznam řádků: název, délka, cena, záloha, starty, aktivní.
- `Přidat službu` vpravo nahoře.
- Editace v sheetu, ne inline karta.
- Varování: služba delší než nejdelší okno; zděděný interval.
- Aktivní/deaktivní switch s jasným stavem.

### Dostupnost

- Sekce: Pracovní doba, Výjimky, Pravidla, Náhled.
- Pracovní doba: řádky Po–Ne, switch, okna, `Přidat okno`.
- Výjimky: seznam datumů + přidání.
- Pravidla: předstih, max/den, rozestup startů.
- Náhled: collapsible / sheet s výběrem služby a volnými starty.
- Desktop 2 sloupce (editor + náhled), mobil pod sebou.

### Platby

- Sekce: Zálohy, Bankovní účet, Fio banka, Fakturace.
- Stavy jako tečka + text, akce `Připojit` / `Odpojit`.
- Žádné karty kolem každé sekce; jedna bílá plocha.

### Integrace

- Google Calendar řádek: stav, účet, poslední sync, reconnect/disconnect.
- Pokud je potřeba reconnect, jasný tenký banner.

### Profil

- Sekce: Veřejný profil, Odkazy, Adresa profilu, Portfolio.
- Náhled profilu nahoře.
- Portfolio grid s drag & drop / výběrem; zachovat limity.
- Sticky save bar při změnách.

---

## 10. Veřejný web

### 10.1 Header

- Bílá/paper plocha, hairline spodní linka při scrollu. Žádný floating pill, žádný blur.
- Vlevo wordmark, uprostřed odkazy, vpravo `Najděte tatéra` + `Začít zdarma`.
- Mobil: logo + menu sheet + CTA.

### 10.2 Landing

1. **Hero** — levá zarovnaná kompozice:
   - Eyebrow `Rezervace pro tatéry`.
   - H1 `Méně papírování. Víc tetování.` 64–80 px.
   - Subcopy 18 px: poptávky, zálohy, kalendář na jednom místě.
   - CTA `Začít zdarma` + `Najít tatéra`.
   - Trust line `Zdarma · zálohy přímo na váš účet`.
   - Vpravo jeden produktový vizuál: dashboard „nejbližší termín + fronta“, bez browser chrome, jemně oříznutý.
2. **Trust strip** — `QR platby · Google kalendář · Žádné provize` s malými ikonami. Technologické logo cloud odstranit; pro tatéra nemá hodnotu.
3. **Jak to funguje** — 3 kroky jako horizontální timeline s velkými čísly 01/02/03, ne 3 stejné karty:
   - Screening poptávek.
   - Záloha QR platbou.
   - Sezení v kalendáři.
4. **Funkce** — 4 střídavé sekce, každá jeden velký výrok + jeden vizuál:
   - `Poptávky, které projdou tvým filtrem.`
   - `Záloha dřív, než se rozjede stroj.`
   - `Kalendář, který drží krok.`
   - `Víš, co se vyplatí.`
5. **Cena** — jeden blok: `Zdarma. Bez provize.` 0 Kč / 0 %, zálohy přímo na účet, CTA.
6. **FAQ** — 5–6 otázek, accordion s hairline.
7. **Final CTA** — jediná plná espresso/inkoustová pasáž: `Méně papírování. Víc tetování.` + CTA.
8. **Footer** — 4 sloupce, wordmark, právní odkazy, kontakt.

Copy: tykání, žádná fake čísla, žádné fake recenze, žádné vymyšlené logo klientů.

### 10.3 Veřejný profil tatéra

- Portfolio-first: jméno 48–56 px, studio, město, styly, avatar 96 px.
- Desktop 2 sloupce: portfolio 7/12, sticky booking karta 5/12.
- Mobil: header, CTA `Rezervovat`, služby, portfolio, o mně, booking.
- Služby jako řádky: název, délka, cena, záloha, `Vybrat`.
- O mně: bio, styly, studio, město, odkazy.
- Pokud není portfolio, použít klidný paper/crema blok s iniciálami, ne fake fotku.

### 10.4 Booking flow

- Kroky: Služba → Termín → Údaje → Shrnutí.
- Progress: tenký 4segmentový pruh, aktivní inkoust, hotové espresso, budoucí muted. Žádné velké kroužky.
- Služba: řádky s radio výběrem, cena/délka/záloha, selected espresso.
- Termín: měsíc + časy Dopoledne/Odpoledne/Večer, 44 px tlačítka.
- Údaje: jméno, e-mail, telefon, popis, vlastní pole, reference (drag & drop, limity), consent.
- Shrnutí: služba, termín, cena, záloha, kontakt; edit links; `Odeslat poptávku`.
- Potvrzení: klidná success obrazovka s dalšími kroky (schválení, záloha), bez confetti.
- Mobil: sticky bottom bar `Pokračovat` + částka/záloha; zpět nahoře.

### 10.5 Adresář tatérů

- Header `Najděte svého tatéra` 48 px, velké hledání, filtr město/styl.
- Grid 3/2/1 sloupců; karty bez stínu, portrait 4:5, jméno, město, styly.
- Hover: jemné zvětšení fotky, ne posun karty.
- Empty state + `Zrušit filtry`.
- Skeleton karty.

### 10.6 Login

- Split layout: vlevo brand statement, vpravo formulář. Na mobilu jen formulář s wordmarkem.
- Jasné error stavy, žádný glass.

---

## 11. Přístupnost

- 1× H1 na stránku, logická hierarchie H2/H3.
- Všechny interaktivní prvky mají viditelný focus ring (2 px coffee, offset 2 px).
- Klávesnicí dosažitelné vše; žádné nested interaktivní prvky.
- Kontrast min. 4.5:1 pro malý text.
- Status nikdy jen barvou; tečka + text.
- Ikony bez textu mají `aria-label`.
- Formuláře: label + helper + error u pole, `aria-describedby`.
- Grafy: `role="img"`, `aria-label`, sr-only tabulka.
- Respektovat `prefers-reduced-motion`.
- Touch targets min. 44 px.
- Žádný horizontální scroll na 390 px.

---

## 12. Implementační plán

### Fáze 0 — Style tile (gate)

- Dočasná stránka `/design-preview` (nebo izolovaná route) s:
  - paletou, typografií, tlačítky, inputy, statusy,
  - hero sekcí landingu,
  - dashboardem Přehled s reálnými/testovacími daty.
- Screenshot 1440 a 390, porovnat s cílem, doladit.
- Teprve po OK pokračovat naplno.

### Fáze 1 — Tokens & primitives

Soubory:
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `panel.tsx`, `badge.tsx`, `skeleton.tsx`, `sheet.tsx`, `dialog.tsx`, `dropdown-menu.tsx`
- `src/components/status-badge.tsx`

Kroky:
- Nahradit paletu, radius, shadow, fonty.
- Geist + fallback Host Grotesk; ověřit českou diakritiku.
- Zvětšit touch targety, focus ring, inputy.
- Odstranit glass/blur z app shellu.
- `npm run lint`, `npm run build`, vizuální kontrola.

### Fáze 2 — App shell & navigace

Soubory:
- `src/app/(dashboard)/dashboard/layout.tsx`
- `sidebar-nav.tsx`, `sidebar-profile.tsx`, `topbar.tsx`
- `src/components/dashboard/mobile-tabs.tsx`, `mobile-nav.tsx`, `user-menu.tsx`
- nový `settings/settings-nav.tsx` + `settings/layout.tsx`

Kroky:
- Nový sidebar 4 + Nastavení/Profil dole.
- Mobilní header + 4 taby; Nastavení do avatar menu.
- Odstranit zvoníček a `PublicLinkBar` z Přehledu.
- Přidat route Rezervace do navigace.
- Ověřit aktivní stavy, klávesnici, 390/1440.

### Fáze 3 — Dashboard Přehled (priorita)

Soubory:
- `src/app/(dashboard)/dashboard/page.tsx`
- nové `dashboard/next-appointment.tsx`, `dashboard/action-queue.tsx`, `dashboard/day-agenda.tsx`, `dashboard/money-summary.tsx`, `dashboard/page-header.tsx`
- `src/lib/dashboard.ts` (pure helpers: next appointment, queue, day agenda, money)
- `dashboard/loading.tsx`, `dashboard/error.tsx`
- refaktor sheet triggeru (`booking-sheet.tsx` nebo hook), aby se sheet neduplikoval

Kroky:
- Implementovat 4 moduly a souhrnnou větu.
- Přesunout frontu z `attention-tasks` do jednotného typu.
- Přesunout plný seznam na Rezervace.
- Stavy: nový tatér, prázdno, hodně akcí, Google odpojen, onboarding.
- Ověřit proti reálným datům a seed scénářům.

### Fáze 4 — Rezervace + detail sheet

Soubory:
- nový `dashboard/bookings/page.tsx`, `loading.tsx`
- `requests-list.tsx`, `booking-row.tsx`, `booking-detail-sheet.tsx`, `booking-actions.tsx`, `booking-message.tsx`, `booking-notes.tsx`, `unmatched-payments.tsx`, `attention-tasks.tsx`
- `booking-view.ts` (label/status helpery)

Kroky:
- Přesunout seznam, filtry, hledání, hromadné schválení.
- Restylovat tabulku/karty a detail sheet.
- Zachovat všechny akce a dialogy.
- Ověřit approve/reject/reschedule/QR/refund.

### Fáze 5 — Kalendář

Soubory:
- `calendar/calendar-view.tsx`, `calendar/page.tsx`, `calendar/actions.ts`
- `src/components/month-calendar.tsx` (sdíleno s Dostupností)
- nový `calendar/free-starts-sheet.tsx`

Kroky:
- Restylovat mřížku a panel dne.
- Přesunout volné starty do sheetu.
- Zachovat blokování dne, výjimky, Google busy.
- Ověřit oba uses (kalendář + dostupnost).

### Fáze 6 — Statistiky

Soubory:
- `dashboard/stats/page.tsx`, `loading.tsx`
- `src/components/stats/charts.tsx`
- `src/lib/stats.ts` (případné sloučení definic)

Kroky:
- 4 primární KPI + tabulka peněz.
- Stacked bar místo donutu, heat strip pro hodiny.
- Zachovat přepínání období a sr-only tabulky.
- Ověřit proti SQL seedu.

### Fáze 7 — Nastavení

Soubory:
- `settings/page.tsx`, nový `settings/layout.tsx` + `settings-nav.tsx`
- `settings/profile/*`, `settings/services/*`, `settings/availability/*`, `settings/payments/*`, `settings/integrations/*`
- `onboarding` dle potřeby

Kroky:
- Hub jako seznam, sub-navigace, bílé formulářové plochy.
- Služby do sheetu, dostupnost do sekcí, platby/integrace do řádků.
- Sticky save bar, destructive zóna.
- Ověřit uložení, validace, unsaved guard.

### Fáze 8 — Veřejný web

Soubory:
- `src/app/(public)/page.tsx`
- `src/components/marketing/*` (hero, steps, features, pricing, faq, cta, header, footer)
- `(site)/artists/*`, `(site)/artist/[slug]/*`
- `(site)/login/page.tsx`
- `src/components/brand.tsx`, `globals.css` marketing utilities

Kroky:
- Landing podle sekcí 10.2.
- Veřejný profil a booking flow.
- Adresář a login.
- Zachovat copy voice, SEO metadata, OG image.
- Odstranit nepoužité marketing komponenty a staré utility.

### Fáze 9 — Finální verifikace

- `npm run lint`
- `npm run build`
- E2E: dashboard hodnoty, fronta, akce, Rezervace, kalendář, statistiky, nastavení, booking flow.
- A11y audit: h1, labels, focus, kontrast, klávesnice.
- Responzivita 390 / 768 / 1440; žádný horizontální scroll.
- Screenshoty všech klíčových obrazovek.
- Data cleanup (seed smazat, nastavení vrátit).
- Zkontrolovat reduced motion a výkon (žádné nové knihovny).

---

## 13. Rizika a mitigace

| Riziko | Mitigace |
|---|---|
| Nový font rozbije českou diakritiku | Ověřit latin-ext, fallback Host Grotesk |
| Přesun seznamu na novou route rozbije odkazy | Aktualizovat všechny odkazy, zachovat `?filtr`, redirect starých URL |
| Fronta bude nejasná | Jasné typy akcí, jen „co má udělat tatér“, max 3 + rozbalení |
| Dashboard bude zase přeplácaný | 4 moduly, žádné KPI karty, žádné quick actions |
| Settings sub-nav přidá složitost | Jednoduché taby, max 5 sekcí, aktivní stav podtržením |
| Měsíční kalendář sdílí komponentu s Dostupností | Restylovat přes tokeny, otestovat oba uses |
| Booking flow se rozbije | Zachovat logiku, měnit jen prezentaci, E2E celý flow |
| Mobile overflow | Test 390 u každé fáze, `min-w-0`, tabulky → karty |
| Příliš mnoho bílé / prázdno | Hierarchie čísly a typem, ne dalšími boxy |

---

## 14. Otevřená rozhodnutí

1. **Rezervace jako nová stránka** — doporučeno. Potvrdit, nebo nechat seznam na Přehledu ve složeném stavu.
2. **Odstranění KPI pásu z Přehledu** — doporučeno; čísla nahradí souhrnná věta + peněžní pruh. Statistiky zůstávají.
3. **Akcentní barva** — Espresso & Cream: espresso `#3B2A20`, coffee `#6F4E37`, crema `#C89F7B`, milk `#EFE6DE` (zvoleno). Success zelená zůstává oddělená.
4. **Wordmark** — ponechat současný blob + wordmark, nebo jemný refresh na lowercase `tattly`? Doporučuji jemný refresh, ne nový symbol.
5. **Landing hero** — levá zarovnaná kompozice (doporučeno) vs. centrovaná. Levá je méně „AI template“.
