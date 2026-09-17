import Link from "next/link";
import { eq } from "drizzle-orm";
import { CheckIcon, XIcon } from "lucide-react";
import { db } from "@/db";
import { services } from "@/db/schema";
import { requireProfile } from "@/lib/session";
import { appUrl } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Panel, PanelSection } from "@/components/panel";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const serviceList = await db
    .select({ id: services.id, isActive: services.isActive })
    .from(services)
    .where(eq(services.profileId, profile.id));

  const rules = profile.bookingRules ?? {};
  const hasSchedule = Object.values(rules.weeklySchedule ?? {}).some(
    (w) => w.length > 0
  );

  const checklist = [
    {
      done: Boolean(profile.googleRefreshToken),
      label: "Připojit Google kalendář",
      href: "/dashboard/settings/integrations",
    },
    {
      done: Boolean(profile.stripeAccountId),
      label: "Připojit Stripe pro platby kartou",
      href: "/dashboard/settings/integrations",
    },
    {
      done: serviceList.some((s) => s.isActive),
      label: "Přidat první službu",
      href: "/dashboard/settings/services",
    },
    {
      done: hasSchedule,
      label: "Nastavit pracovní dobu",
      href: "/dashboard/settings/availability",
    },
    {
      done: Boolean(profile.addressLine),
      label: "Vyplnit adresu podniku",
      href: "/dashboard/settings",
    },
    {
      done: Boolean(profile.bankAccount),
      label: "Vyplnit bankovní účet (QR zálohy a faktury)",
      href: "/dashboard/settings",
    },
  ];
  const allDone = checklist.every((item) => item.done);

  return (
    <div className="space-y-4">
      <PanelSection
        title="Profil"
        description={`Veřejná stránka: ${appUrl()}/artist/${profile.slug}`}
      >
        <ProfileForm
          displayName={profile.displayName}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          defaultDepositCzk={Math.round(profile.defaultDepositAmount / 100)}
          slug={profile.slug}
          addressLine={profile.addressLine}
          city={profile.city}
          zip={profile.zip}
          website={profile.website}
          instagram={profile.instagram}
          tiktok={profile.tiktok}
          facebook={profile.facebook}
          studioName={profile.studioName}
          styles={profile.styles}
          ico={profile.ico}
          dic={profile.dic}
          bankAccount={profile.bankAccount}
        />
      </PanelSection>

      <Panel className="overflow-hidden">
        <div className="border-b border-foreground/8 px-5 py-4">
          <p className="text-sm font-medium">Uvítací checklist</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {allDone
              ? "Vše je připraveno – klienti si u vás mohou rezervovat."
              : "Dokončete kroky a rezervační odkaz bude plně funkční."}
          </p>
        </div>
        <div className="divide-y divide-foreground/6 px-5">
          {checklist.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 py-3"
            >
              <span className="flex items-center gap-2.5 text-sm">
                <span
                  className={
                    item.done
                      ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-status-ok text-white"
                      : "flex size-5 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-muted-foreground"
                  }
                >
                  {item.done ? (
                    <CheckIcon className="size-3" />
                  ) : (
                    <XIcon className="size-3" />
                  )}
                </span>
                <span
                  className={
                    item.done ? "text-muted-foreground line-through" : ""
                  }
                >
                  {item.label}
                </span>
              </span>
              {!item.done && (
                <Button asChild size="sm" variant="outline">
                  <Link href={item.href}>Vyřídit</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
