import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services, type Profile } from "@/db/schema";

export type OnboardingItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export type Onboarding = {
  items: OnboardingItem[];
  doneCount: number;
  total: number;
  complete: boolean;
  nextItem: OnboardingItem | null;
};

export async function getOnboarding(profile: Profile): Promise<Onboarding> {
  const serviceList = await db
    .select({ id: services.id, isActive: services.isActive })
    .from(services)
    .where(eq(services.profileId, profile.id));

  const rules = profile.bookingRules ?? {};
  const hasSchedule = Object.values(rules.weeklySchedule ?? {}).some(
    (windows) => windows.length > 0
  );

  const items: OnboardingItem[] = [
    {
      key: "services",
      label: "Přidat první službu",
      description: "Co klientům nabízíte a jak dlouho to trvá.",
      href: "/dashboard/settings/services",
      done: serviceList.some((s) => s.isActive),
    },
    {
      key: "schedule",
      label: "Nastavit pracovní dobu",
      description: "Z ní se klientům nabízejí volné termíny.",
      href: "/dashboard/settings/availability",
      done: hasSchedule,
    },
    {
      key: "google",
      label: "Připojit Google kalendář",
      description: "Aby se termíny nepotkávaly s vaším programem.",
      href: "/dashboard/settings/integrations",
      done: Boolean(profile.googleRefreshToken),
    },
    {
      key: "bank",
      label: "Vyplnit bankovní účet",
      description: "Pro QR platby zálohy a faktury.",
      href: "/dashboard/settings/payments",
      done: Boolean(profile.bankAccount),
    },
    {
      key: "address",
      label: "Vyplnit adresu podniku",
      description: "Objeví se na faktuře a v e-mailu po zaplacení.",
      href: "/dashboard/settings/profile",
      done: Boolean(profile.addressLine),
    },
  ];

  const doneCount = items.filter((item) => item.done).length;
  const nextItem = items.find((item) => !item.done) ?? null;

  return {
    items,
    doneCount,
    total: items.length,
    complete: doneCount === items.length,
    nextItem,
  };
}
