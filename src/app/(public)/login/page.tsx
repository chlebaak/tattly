import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { LogoBlob, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.email) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="rounded-[2rem] bg-foreground/5 p-2 ring-1 ring-foreground/5">
        <Card className="rounded-[calc(2rem-0.5rem)]">
          <CardHeader className="items-center text-center">
            <LogoBlob className="mx-auto size-16" />
            <CardTitle className="pt-2">
              <Wordmark className="text-lg tracking-[0.08em]" />
            </CardTitle>
            <CardDescription>
              Přihlaste se přes Google. Tímto jedním krokem se zároveň připojí
              váš kalendář.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <Button
                type="submit"
                className="w-full font-bold uppercase tracking-wider"
              >
                Pokračovat přes Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
