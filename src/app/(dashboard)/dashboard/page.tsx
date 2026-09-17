import { requireProfile } from "@/lib/session";
import { SectionHeader } from "@/components/section-header";
import { BookingRow } from "./booking-row";
import { getDashboardData } from "./data";
import { RequestsList } from "./requests-list";

type Props = {
  searchParams: Promise<{ filtr?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const profile = await requireProfile();
  const { filtr } = await searchParams;
  const { bookingsView } = await getDashboardData(profile);

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const attention = bookingsView.filter(
    (b) => b.status === "pending_review" || b.status === "deposit_pending"
  );

  const upcoming = bookingsView
    .filter(
      (b) =>
        b.status === "confirmed" &&
        b.startTimeIso &&
        new Date(b.startTimeIso) > now &&
        new Date(b.startTimeIso) < in48h
    )
    .sort((a, b) =>
      (a.startTimeIso ?? "").localeCompare(b.startTimeIso ?? "")
    );

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Veřejný odkaz na váš profil: /artist/{profile.slug}
      </p>

      {attention.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title="Vyžaduje pozornost"
            count={attention.length}
          />
          <div className="grid gap-2">
            {attention.map((booking) => (
              <BookingRow key={booking.id} booking={booking} quickActions />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Dnes a zítra" count={upcoming.length} />
          <div className="grid gap-2">
            {upcoming.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader
          title="Všechny rezervace"
          count={bookingsView.length}
        />
        <RequestsList
          bookings={bookingsView}
          initialFilter={filtr}
          publicSlug={profile.slug}
        />
      </section>
    </div>
  );
}
