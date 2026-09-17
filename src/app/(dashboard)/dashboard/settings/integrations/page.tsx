import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelSection } from "@/components/panel";
import { startStripeOnboarding } from "../actions";

export default async function IntegrationsPage() {
  const profile = await requireProfile();
  const calendarConnected = Boolean(profile.googleRefreshToken);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PanelSection
        title="Google kalendář"
        description="Volné termíny čteme z vašeho kalendáře a potvrzené rezervace do něj zapisujeme. Připojí se přihlášením přes Google."
      >
        <div className="flex items-center justify-between">
          <Badge variant={calendarConnected ? "secondary" : "outline"}>
            {calendarConnected ? "Připojeno" : "Nepřipojeno"}
          </Badge>
          {!calendarConnected && (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Připojit přes Google</Link>
            </Button>
          )}
        </div>
      </PanelSection>
      <PanelSection
        title="Stripe"
        description="Pro platby záloh kartou (Apple Pay, Google Pay) a automatické výplaty na váš účet. QR zálohy fungují i bez Stripe."
      >
        <div className="flex items-center justify-between">
          <Badge variant={profile.stripeAccountId ? "secondary" : "outline"}>
            {profile.stripeAccountId ? "Připojeno" : "Nepřipojeno"}
          </Badge>
          {!profile.stripeAccountId && (
            <form action={startStripeOnboarding}>
              <Button type="submit" size="sm" variant="outline">
                Připojit Stripe
              </Button>
            </form>
          )}
        </div>
      </PanelSection>
    </div>
  );
}
