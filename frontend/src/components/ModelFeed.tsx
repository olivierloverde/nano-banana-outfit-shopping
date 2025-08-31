'use client'

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { ModelCard } from './ModelCard'
import { ModelCardSkeleton } from './ModelCardSkeleton'

export function ModelFeed() {
  const {
    items: models,
    loading,
    hasMore,
    error,
    containerRef,
    loadingRef,
    refetch
  } = useInfiniteScroll()

  return (
    <div ref={containerRef} className="px-4 py-6 max-w-7xl mx-auto">
      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Connection Issue
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                {error}. Showing sample data instead.
              </p>
            </div>
            <button
              onClick={refetch}
              className="text-sm text-yellow-800 hover:text-yellow-900 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model, index) => (
          <ModelCard 
            key={`${model.id}-${index}`} 
            model={model} 
          />
        ))}
        
        {loading && (
          <>
            {Array.from({ length: 6 }).map((_, index) => (
              <ModelCardSkeleton key={`skeleton-${index}`} />
            ))}
          </>
        )}
      </div>

      {/* Loading trigger element */}
      <div 
        ref={loadingRef} 
        className="h-20 flex items-center justify-center"
      >
        {loading && hasMore && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        )}
        {!hasMore && models.length > 0 && (
          <p className="text-gray-500 text-sm">No more outfits to show</p>
        )}
      </div>
    </div>
  )
}