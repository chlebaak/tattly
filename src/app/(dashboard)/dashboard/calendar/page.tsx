import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { requireProfile } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { CalendarView } from "./calendar-view";
import { getDashboardData } from "../data";

export default async function CalendarPage() {
  const profile = await requireProfile();
  const { bookingsView, blockedDays } = await getDashboardData(profile, {
    full: true,
  });
  const activeServices = await db
    .select({
      id: services.id,
      title: services.title,
      durationMinutes: services.durationMinutes,
    })
    .from(services)
    .where(
      and(eq(services.profileId, profile.id), eq(services.isActive, true))
    )
    .orderBy(services.title);

  const exceptionDays = Object.entries(profile.bookingRules?.exceptions ?? {})
    .filter(([, exception]) => !exception.closed)
    .map(([key]) => key);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalendář"
        description="Potvrzené rezervace, poptávky i zablokované dny. Klepněte na den nebo přímo na termín pro detail."
      />
      <CalendarView
        bookings={bookingsView}
        blockedDays={blockedDays}
        exceptionDays={exceptionDays}
        timezone={profile.timezone}
        services={activeServices}
      />
    </div>
  );
}
