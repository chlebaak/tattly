"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UnplugIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { disconnectGoogleCalendar } from "../actions";

export function DisconnectGoogleButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" size="sm" variant="ghost" disabled={pending}>
          <UnplugIcon data-icon="inline-start" />
          Odpojit kalendář
        </Button>
      }
      title="Odpojit Google kalendář?"
      description="Přestaneme číst volné termíny z vašeho kalendáře a zapisovat do něj nové rezervace. Už potvrzené rezervace zůstanou v kalendáři, dokud je sami nesmažete. Znovu připojit můžete kdykoli."
      confirmLabel="Odpojit"
      tone="destructive"
      pendingLabel="Odpojuji…"
      onConfirm={() => {
        startTransition(async () => {
          const result = await disconnectGoogleCalendar();
          if (!result.ok) {
            toast.error("Odpojení se nezdařilo. Zkuste to znovu.");
            return;
          }
          toast.success("Google kalendář odpojen.");
          router.refresh();
        });
      }}
    />
  );
}
