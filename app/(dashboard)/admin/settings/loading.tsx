import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AdminSettingsLoading() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-7 w-36" /><Skeleton className="h-4 w-52 mt-1" /></div>
      <Card className="border-border/50">
        <CardHeader className="pb-3"><Skeleton className="h-5 w-44" /></CardHeader>
        <CardContent className="divide-y divide-border/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-4 flex items-center justify-between">
              <div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-56" /></div>
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
