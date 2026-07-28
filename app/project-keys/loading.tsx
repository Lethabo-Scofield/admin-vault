import {
  PageHeaderSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <Skeleton className="mb-5 h-11 w-full max-w-md !rounded-xl" />
      <TableSkeleton rows={6} />
    </div>
  );
}
