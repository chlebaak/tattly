import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-[300px] rounded-[20px] lg:col-span-7" />
        <div className="space-y-3 lg:col-span-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-20 rounded-[14px]" />
          <Skeleton className="h-20 rounded-[14px]" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 rounded-[14px]" />
          <Skeleton className="h-16 rounded-[14px]" />
        </div>
        <div className="space-y-3 lg:col-span-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-20 rounded-[14px]" />
          <Skeleton className="h-20 rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
