import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-white/5",
        className
      )}
      {...props}
    />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-12 w-40 rounded-xl" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-3xl space-y-6">
      <div className="flex justify-between items-start">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-6 w-1/4 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}