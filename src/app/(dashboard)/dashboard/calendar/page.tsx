import { requireProfile } from "@/lib/session";
import { CalendarView } from "./calendar-view";
import { getDashboardData } from "../data";

export default async function CalendarPage() {
  const profile = await requireProfile();
  const { bookingsView, chipsByDay, blockedDays } = await getDashboardData(
    profile
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Potvrzené rezervace a poptávky čekající na zálohu. Klikni na den pro
          detail, blokuj dny kdy nemáš čas.
        </p>
      </div>
      <CalendarView
        bookings={bookingsView}
        chipsByDay={chipsByDay}
        blockedDays={blockedDays}
      />
    </div>
  );
}
