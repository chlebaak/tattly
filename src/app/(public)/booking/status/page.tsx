import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function BookingStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const success = state === "success";
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{success ? "Hotovo" : "Platba nedokončena"}</CardTitle>
          <CardDescription>
            {success
              ? "Záloha byla přijata a termín je potvrzený. Potvrzení vám přijde e-mailem."
              : "Platba se nezdařila nebo jste ji zrušili. Termín zůstává vaší rezervací do vypršení lhůty na zálohu."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Zpět</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
