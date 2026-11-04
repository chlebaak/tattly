"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendClientMessage } from "./actions";

export function ClientMessageBox({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await sendClientMessage({ bookingId, message });
      if (!result.ok) {
        toast.error("Zprávu se nepodařilo odeslat.");
        return;
      }
      setMessage("");
      toast.success("Zpráva odeslána e-mailem.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Zpráva klientovi
        </p>
        <span className="text-[11px] text-muted-foreground">
          {message.length}/300
        </span>
      </div>
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        maxLength={300}
        placeholder="Např.: Vezměte si jídlo, sezení potrvá asi 5 hodin."
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Odejde e-mailem a zapíše se do průběhu rezervace.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={pending || message.trim().length < 2}
          onClick={send}
        >
          <SendIcon data-icon="inline-start" />
          {pending ? "Odesílám…" : "Odeslat"}
        </Button>
      </div>
    </div>
  );
}
