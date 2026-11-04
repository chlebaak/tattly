import { ExternalLinkIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { initialsOf } from "@/lib/utils";

export function SidebarProfile({
  displayName,
  slug,
  avatarUrl,
  url,
}: {
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  url: string;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-3">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="text-xs font-semibold">
            {initialsOf(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">/artist/{slug}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <a href={`/artist/${slug}`} target="_blank" rel="noreferrer">
            <ExternalLinkIcon className="size-3.5" />
            Profil
          </a>
        </Button>
        <CopyButton
          value={url}
          label="Odkaz na profil"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
        />
      </div>
    </div>
  );
}
