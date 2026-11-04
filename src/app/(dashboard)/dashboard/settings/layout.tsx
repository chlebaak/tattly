import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nastavení"
        description="Profil, služby, dostupnost, platby a integrace."
      />
      <SettingsNav />
      {children}
    </div>
  );
}
