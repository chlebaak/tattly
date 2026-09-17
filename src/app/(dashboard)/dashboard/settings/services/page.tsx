import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { requireProfile } from "@/lib/session";
import { ServicesManager } from "./services-manager";

export default async function ServicesPage() {
  const profile = await requireProfile();
  const list = await db
    .select()
    .from(services)
    .where(eq(services.profileId, profile.id))
    .orderBy(services.title);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Nabídka pro klienty a screeningová pole, na základě kterých
          posuzujete poptávky.
        </p>
      </div>
      <ServicesManager
        services={list.map((s) => ({
          id: s.id,
          title: s.title,
          durationMinutes: s.durationMinutes,
          slotIntervalMinutes: s.slotIntervalMinutes,
          priceMinor: s.priceMinor,
          depositMinor: s.depositMinor,
          isActive: s.isActive,
          customFormFields: s.customFormFields,
        }))}
      />
    </div>
  );
}
