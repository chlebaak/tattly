import { appUrl } from "@/lib/env";
import { requireProfile } from "@/lib/session";
import { PanelSection } from "@/components/ui/panel";
import { AddressForm } from "./address-form";
import { PortfolioManager } from "./portfolio-manager";
import { ProfileForm } from "./profile-form";
import { SlugForm } from "./slug-form";

export default async function ProfileSettingsPage() {
  const profile = await requireProfile();

  return (
    <div className="space-y-4">
      <PanelSection
        title="Veřejný profil"
        description="Takhle vás uvidí klienti na vaší rezervační stránce."
      >
        <ProfileForm
          displayName={profile.displayName}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          studioName={profile.studioName}
          styles={profile.styles}
          website={profile.website}
          instagram={profile.instagram}
          tiktok={profile.tiktok}
          facebook={profile.facebook}
        />
      </PanelSection>

      <PanelSection
        title="Portfolio"
        description="Ukázky vaší práce na veřejném profilu. Kliknutím na fotku ji klient zvětší."
      >
        <PortfolioManager images={profile.portfolioImages ?? []} />
      </PanelSection>

      <PanelSection
        title="Adresa podniku"
        description="Používá se na fakturách a v e-mailu po zaplacení zálohy."
      >
        <AddressForm
          addressLine={profile.addressLine}
          city={profile.city}
          zip={profile.zip}
          lat={profile.lat}
          lng={profile.lng}
        />
      </PanelSection>

      <PanelSection
        title="Adresa veřejného profilu"
        description="Odkaz, který posíláte klientům a dáváte do Instagram bio."
      >
        <SlugForm
          slug={profile.slug}
          publicUrl={`${appUrl()}/artist/${profile.slug}`}
        />
      </PanelSection>
    </div>
  );
}
