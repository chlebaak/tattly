import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ArtistNotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Profil nenalezen</CardTitle>
          <CardDescription>
            Tento rezervační odkaz neexistuje nebo byl zrušen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Zpět na hlavní stránku</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
