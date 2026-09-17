import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { LogoBlob, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { requireProfile } from "@/lib/session";
import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  const mobileNav = (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          className="lg:hidden"
        >
          <MenuIcon className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 overflow-y-auto p-4">
        <SheetTitle className="flex items-center gap-2">
          <LogoBlob className="size-7" />
          <Wordmark className="text-xs" />
        </SheetTitle>
        <div className="mt-6">
          <SidebarNav />
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r bg-card/60 px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
          <LogoBlob className="size-8" />
          <Wordmark className="text-sm" />
        </Link>
        <SidebarNav />
      </aside>

      <div className="min-w-0">
        <Topbar
          displayName={profile.displayName}
          email={profile.email}
          slug={profile.slug}
          avatarUrl={profile.avatarUrl}
        >
          {mobileNav}
        </Topbar>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
