import { Skeleton } from "@/components/ui/skeleton";

export function SchemaLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-1 h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
