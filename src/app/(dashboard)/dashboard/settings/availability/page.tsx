import { requireProfile } from "@/lib/session";
import { ScheduleEditor } from "./schedule-editor";

export default async function AvailabilityPage() {
  const profile = await requireProfile();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Pracovní doba určuje sloty, ze kterých si klienti vybírají termín.
          Mimo tato okna se termíny nebudou nabízet. Externí události z vašeho
          Google kalendáře se odečítají automaticky.
        </p>
      </div>
      <ScheduleEditor timezone={profile.timezone} rules={profile.bookingRules ?? {}} />
    </div>
  );
}
