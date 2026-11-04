import Link from "next/link";
import { LogoBlob, Wordmark } from "@/components/brand";
import { Container } from "./section";

const COLUMNS = [
  {
    title: "Produkt",
    links: [
      { href: "#jak-to-funguje", label: "Jak to funguje" },
      { href: "#funkce", label: "Funkce" },
      { href: "#cena", label: "Cena" },
      { href: "#faq", label: "Časté otázky" },
    ],
  },
  {
    title: "Pro klienty",
    links: [
      { href: "/artists", label: "Najdi tatéra" },
      { href: "/booking/status", label: "Stav rezervace" },
    ],
  },
  {
    title: "Právní",
    links: [
      { href: "/privacy", label: "Ochrana údajů" },
      { href: "/terms", label: "Podmínky" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoBlob className="size-8" />
              <Wordmark className="text-base" />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Rezervační systém, který za tebe vyřídí poptávky, zálohy i
              kalendář.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Tattly.eu</p>
          <p>Vyrobeno v Česku</p>
        </div>
      </Container>
    </footer>
  );
}
