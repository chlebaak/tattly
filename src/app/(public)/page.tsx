import Link from "next/link";
import { ArrowRight, MailIcon } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Eyebrow, LogoBlob, Wordmark } from "@/components/brand";
import { DrawLine } from "@/components/draw-line";
import { Reveal } from "@/components/reveal";

const steps = [
  {
    number: "01",
    title: "Screening",
    description:
      "Klient nahraje reference a odpoví na tvůj dotazník. Vybereš, koho vezmeš – ne naopak.",
  },
  {
    number: "02",
    title: "Záloha",
    description:
      "Schválíš termín a klientovi přijde odkaz na zálohu. Do 24 hodin se zablokuje, poté se uvolní sám.",
  },
  {
    number: "03",
    title: "Sezení",
    description:
      "Potvrzené sezení se zapíše do tvého Google kalendáře. Ty už jen tvoříš.",
  },
];

const stack = [
  {
    logo: "/stripe.png",
    name: "Stripe",
    title: "Zálohy i platby kartou",
    description:
      "Klient zaplatí kartou, Apple Pay nebo Google Pay a peníze putují rovnou na tvůj účet. Bereme si jen malou provizi z každé uhrazené zálohy.",
  },
  {
    logo: "/google.png",
    name: "Google",
    title: "Kalendář i přihlášení",
    description:
      "Volné termíny čteme z tvého Google kalendáře a potvrzené sezení do něj zapisujeme. Jeden OAuth tok a hotovo.",
  },
  {
    logo: "/resend.svg",
    name: "E-maily",
    title: "Potvrzení, připomínky, storna",
    description:
      "Klient dostane potvrzení s kalendářním souborem, připomínku den předem a okamžitou zprávu při každé změně. Bez jediného napsaného e-mailu.",
  },
  {
    logo: "/cloudflare.png",
    name: "Cloudflare",
    title: "Referenční fotky",
    description:
      "Fotky se nahrávají přímo do zabezpečeného úložiště přes krátkodobé odkazy. Rychlé na mobilu, bez čekání.",
  },
  {
    logo: "/neon.png",
    name: "Neon",
    title: "Data v bezpečí",
    description:
      "Vše běží na serverless Postgres databázi. Rezervace, zámky slotů i platby okamžitě a spolehlivě.",
  },
  {
    logo: "/vercel.png",
    name: "Vercel",
    title: "Rychlé všude",
    description:
      "Optimalizováno pro mobil — většina klientů přijde z Instagramu a formulář se vyplní na telefonu pohodlně.",
  },
];

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default async function HomePage() {
  const session = await auth();
  const loggedIn = Boolean(session?.user?.email);
  return (
    <main id="main" className="relative min-h-svh">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Přeskočit na obsah
      </a>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-30 opacity-[0.035] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />

      <div
        aria-hidden
        className="scroll-progress fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-foreground"
      />
      <header className="animate-drop fixed inset-x-0 top-4 z-40 mx-auto w-fit max-w-[calc(100vw-2rem)]">
        <div className="flex h-12 items-center justify-between gap-6 rounded-full border bg-background/80 pl-4 pr-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur">
          <Link href="/" className="flex items-center gap-2">
            <LogoBlob className="size-7" />
            <Wordmark className="text-xs" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/artists"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Najdi tatéra
            </Link>
            <Button asChild size="sm">
              <Link href={loggedIn ? "/dashboard" : "/login"}>
                {loggedIn ? "Přejít do aplikace" : "Pro profesionály"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section
        id="hero"
        className="relative mx-auto max-w-6xl px-4 pt-28 pb-16 sm:pt-36 sm:pb-24"
      >
        <div
          aria-hidden
          className="animate-in-brand pointer-events-none absolute right-6 top-16 hidden shrink-0 lg:block"
          style={{ animationDelay: "500ms" }}
        >
          <LogoBlob className="w-52 animate-float" />
        </div>
        <div className="animate-in-brand">
          <Eyebrow>Rezervační systém pro tatéry a trenéry</Eyebrow>
        </div>
        <h1 className="mt-6 font-display text-[clamp(3.5rem,13vw,10rem)] leading-[0.95] font-semibold tracking-[-0.02em]">
          <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
            <span
              className="animate-line-reveal block"
              style={{ animationDelay: "100ms" }}
            >
              Book.
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
            <span
              className="animate-line-reveal block italic"
              style={{ animationDelay: "200ms" }}
            >
              Pay.
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
            <span
              className="animate-line-reveal relative block"
              style={{ animationDelay: "300ms" }}
            >
              <span className="text-outline">Enjoy.</span>
              <span
                aria-hidden
                className="animate-enjoy-fill pointer-events-none absolute inset-0 text-foreground"
              >
                Enjoy.
              </span>
            </span>
          </span>
        </h1>
        <div className="mt-12 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <p
            className="animate-in-brand max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty"
            style={{ animationDelay: "350ms" }}
          >
            Tattly je automatizace rezervací, která za tebe vyřídí poptávky,
            zálohy i kalendář. Ty zůstaneš u toho, co umíš nejlíp.
          </p>
          <div
            className="animate-in-brand flex shrink-0 flex-col items-start gap-3"
            style={{ animationDelay: "450ms" }}
          >
              <Button
                asChild
                size="lg"
                className="group h-11 min-w-56 rounded-full px-5 font-bold uppercase tracking-wider"
              >
                <Link href={loggedIn ? "/dashboard" : "/login"}>
                  {loggedIn ? "Přejít do aplikace" : "Přihlásit se"}
                  <span className="ml-1 flex size-7 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform duration-300 ease-brand group-hover:translate-x-1">
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </Button>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Účet zdarma · provize jen ze záloh
            </p>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y py-4 select-none [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex w-max items-center">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 items-center"
              aria-hidden={copy === 1}
            >
              {Array.from({ length: 4 }).flatMap((_, repeat) =>
                ["Book", "Pay", "Enjoy", "Tattly.eu"].map((item, index) => (
                  <span
                    key={`${repeat}-${index}`}
                    className="flex items-center font-display pr-10 text-3xl tracking-tight"
                  >
                    {item}
                    <span className="ml-10 size-2 rounded-full bg-foreground/25" />
                  </span>
                )),
              )}
            </div>
          ))}
        </div>
      </div>

      <section id="jak-to-funguje" className="scroll-mt-28">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <Reveal>
            <Eyebrow>Jak to funguje</Eyebrow>
            <h2 className="mt-4 max-w-3xl text-balance font-display text-4xl leading-[1.1] font-semibold tracking-[-0.01em] sm:text-6xl">
              Tvůj kalendář přestane být <em>chaos.</em>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.number} delay={index * 100}>
                <div className="relative">
                  <p className="text-outline font-display text-7xl tracking-tight">
                    {step.number}
                  </p>
                  <h3 className="mt-4 font-display text-2xl">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  {index < steps.length - 1 && (
                    <DrawLine
                      delay={index * 100 + 200}
                      className="absolute top-8 -right-5 hidden w-10 md:block"
                    />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pod-kapotou"
        className="scroll-mt-28 border-t bg-primary-foreground"
      >
        <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <Reveal>
            <Eyebrow>Pod kapotou</Eyebrow>
            <h2 className="mt-4 max-w-3xl text-balance font-display text-4xl leading-[1.1] font-semibold tracking-[-0.01em] sm:text-6xl">
              Zálohy, maily, kalendář. <em>Běží samy.</em>
            </h2>
          </Reveal>
          <div className="mt-14 border-t">
            {stack.map((row, index) => (
              <Reveal key={row.name} delay={index * 60}>
                <div className="group relative grid items-center gap-4 border-b py-8 sm:grid-cols-[200px_1fr]">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-foreground/60 transition-transform duration-400 ease-brand group-hover:scale-x-100 motion-reduce:transition-none"
                  />
                  <div className="flex h-10 items-center">
                    {row.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.logo}
                        alt={row.name}
                        loading="lazy"
                        decoding="async"
                        width={120}
                        height={40}
                        className="h-auto max-h-10 w-auto object-contain p-2 transition-transform duration-300 ease-brand group-hover:-translate-y-0.5"
                      />
                    ) : (
                      <MailIcon className="size-6 text-foreground/70" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-2xl tracking-tight">
                      {row.title}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      {row.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="cena" className="scroll-mt-28 border-t">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <Reveal>
            <Eyebrow>Kolik to stojí</Eyebrow>
            <div className="mt-6 grid items-end gap-10 md:grid-cols-2">
              <div>
                <p className="font-display text-[clamp(4rem,12vw,9rem)] leading-none tracking-tight tabular-nums">
                  0&nbsp;Kč
                </p>
                <p className="mt-3 text-lg text-muted-foreground">
                  měsíční paušál. Žádné předplatné, žádné skryté poplatky.
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-foreground/5 p-1.5 ring-1 ring-foreground/5">
                <div className="space-y-3 rounded-[calc(1.75rem-0.375rem)] border bg-card p-6">
                  <p className="font-display text-5xl tracking-tight tabular-nums">
                    5&nbsp;%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    z každé{" "}
                    <strong className="text-foreground">uhrazené</strong>{" "}
                    zálohy. Proto jsme motivovaní, aby klienti platili a
                    chodili. Neuhrazená záloha tě nic nestojí.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
              Účet je zdarma. Z každé uhrazené zálohy si vezmeme 5&nbsp;% — když
              klienti chodí, platíš pár korun. Když ne, neplatíš nic.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-20 sm:py-24 md:flex-row md:items-center">
          <h2 className="font-display text-4xl leading-[1.05] font-semibold tracking-[-0.01em] text-balance sm:text-6xl">
            Máš Google
            <br />
            <em>kalendář?</em>
          </h2>
          <div>
            <p className="max-w-md text-sm opacity-70">
              Tohle je vše, co potřebuješ. Nastav pracovní dobu, přidej služby a
              sdílej odkaz.
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="group mt-4 h-11 min-w-48 rounded-full bg-primary-foreground px-5 font-bold uppercase tracking-wider text-primary hover:bg-primary-foreground/90"
            >
              <Link href="/login">
                Začít
                <span className="ml-1 flex size-7 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300 ease-brand group-hover:translate-x-1">
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <LogoBlob className="size-8" />
            <Wordmark className="text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {[
              { src: "/stripe.png", alt: "Stripe" },
              { src: "/google.png", alt: "Google" },
              { src: "/resend.svg", alt: "Resend" },
              { src: "/cloudflare.png", alt: "Cloudflare" },
              { src: "/neon.png", alt: "Neon" },
              { src: "/vercel.png", alt: "Vercel" },
            ].map((logo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                loading="lazy"
                decoding="async"
                width={80}
                height={16}
                className="h-4 w-auto opacity-80 grayscale mix-blend-multiply"
              />
            ))}
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Link
                href="/privacy"
                className="transition-colors hover:text-foreground"
              >
                Ochrana údajů
              </Link>
              <Link
                href="/terms"
                className="transition-colors hover:text-foreground"
              >
                Podmínky
              </Link>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Book. Pay. Enjoy.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
