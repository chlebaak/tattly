import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { LogoBlob, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.email) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="text-lg font-semibold tracking-[-0.045em]">
          tattly<span className="text-primary-foreground/60">.eu</span>
        </Link>
        <div className="max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary-foreground/60">
            Rezervace pro tatéry
          </p>
          <h1 className="mt-3 text-4xl leading-[1.02] font-semibold tracking-[-0.045em]">
            Méně papírování.
            <br />
            Víc tetování.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-primary-foreground/75">
            Poptávky, zálohy i kalendář na jednom místě. Přihlaste se a začněte
            přijímat rezervace.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Zdarma · zálohy přímo na váš účet
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 lg:hidden">
            <LogoBlob className="size-8" />
            <Wordmark className="text-base" />
          </div>
          <h1 className="mt-8 text-2xl font-semibold tracking-[-0.03em] lg:mt-0">
            Přihlášení
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Přihlaste se přes Google. Tímto jedním krokem se zároveň připojí
            váš kalendář.
          </p>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" size="lg" className="mt-6 w-full">
              Pokračovat přes Google
            </Button>
          </form>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Přihlášením souhlasíte s{" "}
            <Link href="/terms" className="underline underline-offset-4">
              podmínkami
            </Link>{" "}
            a{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              zásadami ochrany údajů
            </Link>
            .
          </p>

          <Link
            href="/"
            className="mt-8 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Zpět na web
          </Link>
        </div>
      </div>
    </main>
  );
}
