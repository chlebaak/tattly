import { requireProfile } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardData } from "../data";
import { RequestsList } from "../requests-list";

type Props = {
  searchParams: Promise<{ filtr?: string }>;
};

export default async function BookingsPage({ searchParams }: Props) {
  const profile = await requireProfile();
  const { filtr } = await searchParams;
  const { bookingsView, listTruncated } = await getDashboardData(profile);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rezervace"
        description="Všechny poptávky, potvrzené termíny i historie na jednom místě."
      />
      <RequestsList
        bookings={bookingsView}
        initialFilter={filtr}
        publicSlug={profile.slug}
        truncated={listTruncated}
      />
    </div>
  );
}
