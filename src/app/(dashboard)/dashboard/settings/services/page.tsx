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

  const windows = Object.values(
    profile.bookingRules?.weeklySchedule ?? {}
  ).flat();
  const maxWindowMinutes = windows.reduce((max, window) => {
    const [fromH, fromM] = window.from.split(":").map(Number);
    const [toH, toM] = window.to.split(":").map(Number);
    const minutes = toH! * 60 + toM! - (fromH! * 60 + fromM!);
    return Math.max(max, minutes);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Nabídka pro klienty a screeningová pole, na základě kterých
          posuzujete poptávky.
        </p>
      </div>
      <ServicesManager
        defaultSlotInterval={profile.bookingRules?.slotIntervalMinutes ?? null}
        maxWindowMinutes={maxWindowMinutes}
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
