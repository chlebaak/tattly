import Link from "next/link";
import {
  ArrowRightIcon,
  ClockIcon,
  CreditCardIcon,
  LayersIcon,
  PlugIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { getOnboarding } from "@/lib/onboarding";
import { requireProfile } from "@/lib/session";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

const ITEMS: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/dashboard/settings/profile",
    title: "Profil a veřejná stránka",
    description: "Jméno, fotka, popis, odkazy a adresa profilu.",
    icon: UserIcon,
  },
  {
    href: "/dashboard/settings/services",
    title: "Služby",
    description: "Co nabízíte, jak dlouho to trvá a kolik stojí.",
    icon: LayersIcon,
  },
  {
    href: "/dashboard/settings/availability",
    title: "Dostupnost",
    description: "Pracovní doba, výjimky a jak se tvoří volné termíny.",
    icon: ClockIcon,
  },
  {
    href: "/dashboard/settings/payments",
    title: "Platby a fakturace",
    description: "Zálohy QR platbou, bankovní účet a fakturace.",
    icon: CreditCardIcon,
  },
  {
    href: "/dashboard/settings/integrations",
    title: "Integrace",
    description: "Google kalendář a napojení na vaše nástroje.",
    icon: PlugIcon,
  },
];

export default async function SettingsPage() {
  const profile = await requireProfile();
  const onboarding = await getOnboarding(profile);

  return (
    <div className="space-y-4">
      {!onboarding.complete && <OnboardingChecklist onboarding={onboarding} />}

      <div className="overflow-hidden rounded-[18px] border border-border bg-card">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-3 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
              <item.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{item.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {item.description}
              </span>
            </span>
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        ))}
      </div>
    </div>
  );
}
