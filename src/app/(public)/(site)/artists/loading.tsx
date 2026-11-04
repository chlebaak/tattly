import { Skeleton } from "@/components/ui/skeleton";

export default function ArtistsLoading() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-10 pb-16 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-4 h-10 w-full max-w-xl sm:h-12" />
      <Skeleton className="mt-3 h-4 w-full max-w-lg" />

      <div className="mt-8 grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]">
        <Skeleton className="h-11 w-full rounded-[10px]" />
        <Skeleton className="h-11 w-full rounded-[10px]" />
        <Skeleton className="h-11 w-full rounded-[10px] sm:w-40" />
      </div>

      <Skeleton className="mt-6 h-5 w-32" />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[18px] border border-border bg-card"
          >
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
