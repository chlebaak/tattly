import Link from "next/link";
import { CalendarCheckIcon, InfoIcon, WalletIcon } from "lucide-react";
import { requireProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { PanelSection } from "@/components/ui/panel";
import { DisconnectGoogleButton } from "./disconnect-google-button";
import { ConnectGoogleButton } from "./connect-google-button";

export default async function IntegrationsPage() {
  const profile = await requireProfile();
  const calendarConnected = Boolean(profile.googleRefreshToken);
  const needsReconnect = calendarConnected && profile.googleNeedsReconnect;

  return (
    <div className="space-y-4">
      <PanelSection
        title="Google kalendář"
        description="Volné termíny čteme z vašeho kalendáře a potvrzené rezervace do něj zapisujeme."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span
              className={
                needsReconnect
                  ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-status-attention-soft text-status-attention"
                  : calendarConnected
                    ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-status-ok-soft text-status-ok"
                    : "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
              }
            >
              <CalendarCheckIcon className="size-4" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {needsReconnect
                  ? "Propojení s kalendářem vypršelo"
                  : calendarConnected
                    ? "Kalendář je propojený"
                    : "Kalendář zatím není propojený"}
              </p>
              <p className="text-xs text-muted-foreground">
                {needsReconnect
                  ? `Google odvolal přístup k účtu ${profile.email} (např. po změně hesla). Dokud kalendář znovu nepřipojíte, termíny z něj neblokujeme.`
                  : calendarConnected
                    ? `Účet ${profile.email}. Termíny z vašeho kalendáře blokujeme, aby se rezervace nepotkávaly.`
                    : "Bez propojení nevidíme, kdy máte v kalendáři jiný program – klient si může vybrat termín, kdy nejste k dispozici."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {needsReconnect ? (
              <>
                <ConnectGoogleButton />
                <DisconnectGoogleButton />
              </>
            ) : calendarConnected ? (
              <DisconnectGoogleButton />
            ) : (
              <ConnectGoogleButton />
            )}
          </div>

          <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            Přihlášení přes Google řeší dvě věci najednou: vytvoří vám účet a
            zpřístupní kalendář. Souhlas se dá kdykoli odvolat tlačítkem výše.
          </p>
        </div>
      </PanelSection>

      <PanelSection
        title="Platby"
        description="Zálohy klientů chodí na váš bankovní účet QR platbou – Tattly si nebere nic."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <WalletIcon className="size-4" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {profile.bankAccount
                  ? "Bankovní účet je vyplněný"
                  : "Bankovní účet zatím chybí"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile.bankAccount
                  ? "Klienti zaplatí zálohu QR platbou přímo na něj a vy ji jedním klikem potvrdíte."
                  : "Bez účtu není kam zálohu poslat – rezervace potvrzujeme rovnou a bez zálohy."}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/settings/payments">
              <WalletIcon data-icon="inline-start" />
              Nastavit platby
            </Link>
          </Button>
        </div>
      </PanelSection>
    </div>
  );
}
