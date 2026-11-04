import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { appUrl } from "@/lib/env";
import { getOnboarding } from "@/lib/onboarding";
import { requireProfile } from "@/lib/session";
import { OnboardingWizard } from "./wizard";

export default async function OnboardingPage() {
  const profile = await requireProfile();
  const [onboarding, serviceList] = await Promise.all([
    getOnboarding(profile),
    db
      .select({ id: services.id, title: services.title })
      .from(services)
      .where(eq(services.profileId, profile.id)),
  ]);

  const byKey = Object.fromEntries(
    onboarding.items.map((item) => [item.key, item.done])
  );

  const initialStep = !byKey.services
    ? 2
    : !byKey.schedule
      ? 3
      : !byKey.bank
        ? 4
        : 5;

  return (
    <OnboardingWizard
      initialStep={initialStep}
      displayName={profile.displayName}
      studioName={profile.studioName}
      bio={profile.bio}
      avatarUrl={profile.avatarUrl}
      timezone={profile.timezone || "Europe/Prague"}
      hasServices={serviceList.length > 0}
      hasSchedule={Boolean(byKey.schedule)}
      bankAccount={profile.bankAccount}
      publicUrl={`${appUrl()}/artist/${profile.slug}`}
    />
  );
}
