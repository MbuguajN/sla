import { Skeleton, ListItemSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton"

export default function ProjectsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <PageHeaderSkeleton />

      {/* Filter pills skeleton */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
        <Skeleton className="h-4 w-4 rounded" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Project cards skeleton */}
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
