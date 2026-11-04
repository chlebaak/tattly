import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { requireProfile } from "@/lib/session";
import { ScheduleEditor } from "./schedule-editor";

export default async function AvailabilityPage() {
  const profile = await requireProfile();
  const activeServices = await db
    .select({
      id: services.id,
      title: services.title,
      durationMinutes: services.durationMinutes,
      slotIntervalMinutes: services.slotIntervalMinutes,
    })
    .from(services)
    .where(
      and(eq(services.profileId, profile.id), eq(services.isActive, true))
    )
    .orderBy(services.title);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Pracovní doba určuje termíny, ze kterých si klienti vybírají.
          Mimo tato okna se termíny nebudou nabízet. Externí události z vašeho
          Google kalendáře se odečítají automaticky.
        </p>
      </div>
      <ScheduleEditor
        timezone={profile.timezone}
        rules={profile.bookingRules ?? {}}
        services={activeServices}
      />
    </div>
  );
}
