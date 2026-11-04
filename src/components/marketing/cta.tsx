import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "./section";

export function FinalCta({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <section className="bg-primary text-primary-foreground">
      <Container className="py-20 sm:py-24">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary-foreground/60">
              Začni během pár minut
            </p>
            <h2 className="mt-3 text-4xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              Méně papírování.
              <br />
              Víc tetování.
            </h2>
          </div>
          <div className="max-w-md">
            <p className="text-sm leading-relaxed text-primary-foreground/75">
              Nastav pracovní dobu, přidej služby a sdílej odkaz. Screening,
              zálohy i kalendář poběží samy.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button
                asChild
                size="lg"
                className="bg-crema text-espresso hover:bg-crema/90"
              >
                <Link href={loggedIn ? "/dashboard" : "/login"}>
                  {loggedIn ? "Přejít do aplikace" : "Začít zdarma"}
                </Link>
              </Button>
              <Link
                href="/artists"
                className="rounded-[10px] px-3 py-2 text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
              >
                Najdi tatéra
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
