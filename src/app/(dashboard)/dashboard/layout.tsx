import Link from "next/link";
import { appUrl } from "@/lib/env";
import { getActionCount } from "@/lib/dashboard";
import { requireProfile } from "@/lib/session";
import { LogoBlob, Wordmark } from "@/components/brand";
import { MobileTabs } from "@/components/dashboard/mobile-tabs";
import { SidebarNav } from "./sidebar-nav";
import { SidebarProfile } from "./sidebar-profile";
import { UserMenu } from "./user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const attentionCount = await getActionCount(profile.id);
  const publicUrl = `${appUrl()}/artist/${profile.slug}`;

  const userMenu = (
    <UserMenu
      displayName={profile.displayName}
      email={profile.email}
      slug={profile.slug}
      avatarUrl={profile.avatarUrl}
    />
  );

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Link
          href="/dashboard"
          className="mb-8 flex items-center gap-2.5 px-2"
          aria-label="Tattly – přehled"
        >
          <LogoBlob className="size-8" />
          <Wordmark className="text-base" />
        </Link>
        <SidebarNav attentionCount={attentionCount} />
        <div className="mt-4">
          <SidebarProfile
            displayName={profile.displayName}
            slug={profile.slug}
            avatarUrl={profile.avatarUrl}
            url={publicUrl}
          />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            aria-label="Tattly – přehled"
          >
            <LogoBlob className="size-7" />
            <Wordmark className="text-sm" />
          </Link>
          {userMenu}
        </header>

        <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>

        <MobileTabs attentionCount={attentionCount} />
      </div>
    </div>
  );
}
