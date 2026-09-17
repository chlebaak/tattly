"use client";

import Link from "next/link";
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  LinkIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsOf } from "@/lib/utils";
import { signOutAction } from "./auth-actions";

export function UserMenu({
  displayName,
  email,
  slug,
  avatarUrl,
}: {
  displayName: string;
  email: string;
  slug: string;
  avatarUrl: string | null;
}) {
  function copyLink() {
    const url = `${window.location.origin}/artist/${slug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Odkaz na profil zkopírován"))
      .catch(() => toast.error("Kopírování se nezdařilo"));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu účtu"
          className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-7">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-xs font-semibold">
              {initialsOf(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
            {displayName}
          </span>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`/artist/${slug}`} target="_blank" rel="noreferrer">
            <ExternalLinkIcon />
            Můj veřejný profil
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={copyLink}>
          <LinkIcon />
          Kopírovat odkaz na profil
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <SettingsIcon />
            Nastavení
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void signOutAction();
          }}
        >
          <LogOutIcon />
          Odhlásit se
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
