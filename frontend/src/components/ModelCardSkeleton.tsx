export function ModelCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm">
      <div className="aspect-[3/4] skeleton" />
      <div className="p-3">
        <div className="h-5 skeleton rounded w-3/4" />
      </div>
    </div>
  )
}