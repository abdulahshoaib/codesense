import { Skeleton } from "@/components/ui/skeleton";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({
  rows = 4,
  columns = 4
}: TableSkeletonProps): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-none border border-border">
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-3 py-2">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`head-${index}`} className="h-3.5 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-4 flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
