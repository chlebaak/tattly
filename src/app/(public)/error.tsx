"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangleIcon className="size-5" />
      </span>
      <h1 className="mt-1 text-base font-semibold">Něco se pokazilo</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Stránku se nepodařilo načíst. Zkuste to prosím znovu.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>Zkusit znovu</Button>
        <Button asChild variant="ghost">
          <Link href="/">Zpět na úvod</Link>
        </Button>
      </div>
    </main>
  );
}
