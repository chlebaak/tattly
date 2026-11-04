import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-80 max-w-full rounded-[10px]" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-border bg-border lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-none" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-64 rounded-[18px]" />
        <Skeleton className="h-64 rounded-[18px]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-[18px]" />
        <Skeleton className="h-56 rounded-[18px]" />
      </div>
    </div>
  );
}
