# Google OAuth verification — Tattly

Tento dokument je pracovní podklad pro Google OAuth verification. Doplň doménu,
kontaktní e-mail a nahraj výsledné texty do Google Cloud Console.

## 1. Scopes

Aplikace žádá:

```text
openid
email
profile
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
```

`calendar.readonly` a `calendar.events` jsou **sensitive scopes**. Pro veřejné
uživatele bude potřeba OAuth verification. U Calendar scopes se obvykle neřeší
CASA security assessment (ten je pro restricted scopes jako Gmail/Drive).

## 2. Co musí být hotové před podáním

- [ ] Produkční doména je veřejně dostupná (bez Vercel deployment protection).
- [ ] Homepage, privacy policy a terms jsou veřejné a bez placeholderů.
- [ ] Privacy policy obsahuje Google data, Limited Use a možnost výmazu.
- [ ] Ověřená doména v Google Search Console (DNS TXT).
- [ ] OAuth consent screen má název, logo, support e-mail a odkazy.
- [ ] OAuth client má správný redirect URI:
      `https://tattly.eu/api/auth/callback/google`
- [ ] Autorized JavaScript origin: `https://tattly.eu`
- [ ] Demo video je nahrané jako unlisted na YouTube.
- [ ] Test users jsou nastavení pro dobu před schválením.
- [ ] `AUTH_URL` a případně `AUTH_TRUST_HOST` jsou v produkci správně.
- [ ] `NEXT_PUBLIC_APP_URL` je produkční doména, ne localhost.
- [ ] E-maily z Resendu chodí z ověřené domény.

## 3. Google Cloud Console

1. Vyber projekt, ve kterém je Google Calendar API povolené.
2. Otevři **APIs & Services → OAuth consent screen**.
3. User type: **External**.
4. App information:
   - App name: `Tattly`
   - User support email: doménový e-mail (např. `info@tattly.eu`)
   - App logo: 120×120 PNG
   - Application home page: `https://tattly.eu`
   - Privacy policy: `https://tattly.eu/privacy`
   - Terms of service: `https://tattly.eu/terms`
   - Authorized domains: `tattly.eu`
   - Developer contact: doménový e-mail
5. Scopes: přidej všech pět výše uvedených.
6. OAuth client:
   - Type: Web application
   - Authorized JavaScript origins: `https://tattly.eu`
   - Authorized redirect URIs: `https://tattly.eu/api/auth/callback/google`
7. Přidej test users (max 100) pro dobu před verifikací.
8. Ověř doménu v Search Console a přidej ji mezi authorized domains.
9. Odešli verification.

## 4. English scope justification

Použij tento text v verification formu:

```text
Tattly is a booking platform for tattoo artists and other independent
professionals. Users sign in with Google to create and manage their account.

We request:
- openid, email, profile: authentication and basic account identity.
- calendar.readonly: we call the Google Calendar free/busy endpoint only to
  read busy intervals and prevent clients from booking over existing
  appointments. We do not read or store the contents of users' calendar
  events.
- calendar.events: we create, update and delete only calendar events that
  Tattly itself creates for confirmed bookings. This keeps the artist's
  calendar in sync when a booking is approved, rescheduled or cancelled.

We do not sell Google user data, use it for advertising, or use it to train
generalized AI models. Users can disconnect Google Calendar in settings,
which revokes the token and deletes the stored refresh token. Account and
data deletion instructions are available in our privacy policy.

Our use complies with the Google API Services User Data Policy, including
the Limited Use requirements.
```

## 5. Demo video — scénář

Délka 2–4 minuty, anglicky nebo s anglickými titulky, unlisted YouTube.

1. **Homepage**
   - Ukaž `https://tattly.eu`, vysvětli, že jde o rezervační platformu pro tatéry.
2. **Legal**
   - Otevři privacy policy a terms; ukaž sekci o Google datech a výmazu.
3. **Sign in**
   - Klikni na přihlášení Google účtem.
   - Ukaž OAuth consent screen se všemi scopes.
4. **Calendar connect**
   - Po přihlášení ukaž dashboard a propojení Google kalendáře.
5. **Read / free-busy**
   - Vysvětli, že čteš jen obsazené intervaly.
   - Ukaž, že existující událost v kalendáři zablokuje volný slot.
6. **Write / events**
   - Vytvoř nebo schval rezervaci.
   - Ukaž, že se událost objeví v Google kalendáři.
7. **Update / delete**
   - Přesuň rezervaci a ukaž aktualizaci události.
   - Zruš rezervaci a ukaž smazání události.
8. **Disconnect / deletion**
   - Ukaž Nastavení → Integrace → odpojit kalendář.
   - Vysvětli, že se odvolá token a smaže se uložený refresh token.
9. **Limited Use**
   - Řekni, že data nepoužíváš pro reklamu, neprodáváš je a nepoužíváš k
     trénování modelů.

## 6. Co musí být v privacy policy

- Jaká Google data se čtou: pouze free/busy intervaly.
- Co se zapisuje: události vytvořené Tattly pro potvrzené rezervace.
- Jaká data jsou v události: jméno, e-mail, telefon, popis, termín.
- Že se ukládá šifrovaný refresh token a ID vytvořené události.
- Jak dlouho se data uchovávají.
- Jak funguje odpojení kalendáře a výmaz účtu.
- Seznam subprocesorů (Google, Resend, Cloudflare, Neon, Vercel, Mapy.cz,
  Inngest, Fio banka).
- Google API Services User Data Policy a Limited Use.
- Kontakt pro uplatnění práv.

## 7. Časté důvody zamítnutí

- Privacy nebo terms obsahují placeholdery.
- Homepage je za přihlášením nebo deployment protection.
- Demo video neukazuje reálný OAuth consent.
- Video neukazuje práci s kalendářem (read i write).
- Chybí zdůvodnění jednotlivých scopes.
- App name, logo nebo doména nesedí.
- Doména není ověřená.
- Redirect URI nesedí.
- Privacy neobsahuje Google data, Limited Use nebo výmaz.
- Aplikace data používá jinak, než říká privacy.

## 8. IČO a právní forma

Pro Google OAuth verification **IČO není podmínkou**. Google neověřuje
podnikání ani zisk; ověřuje identitu aplikace a práci s citlivými daty.

Provozovatel může být fyzická osoba:

```text
Jan Fiala, fyzická osoba
korespondenční adresa: [doplnit]
e-mail: [doplnit doménový e-mail]
```

Do privacy/terms patří jméno a kontakt. IČO se uvádí jen tehdy, pokud ho
máte. Pokud Google v konkrétním případě požádá o obchodní údaje, vysvětlete,
že jde o individuální projekt fyzické osoby; můžete doložit identitu a
vlastnictví domény. Nevymýšlejte IČO ani firmu.

## 9. Timeline

- Podáním verification to nekončí; sleduj e-mail a reaguj na dotazy.
- Schválení může trvat dny až týdny, u sensitive scopes déle.
- Do schválení lze pustit jen test users.
- Po schválení přepni publishing status na **In production** a znovu
  otestuj přihlášení na produkci.
