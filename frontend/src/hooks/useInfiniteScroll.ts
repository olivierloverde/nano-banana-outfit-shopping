'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Model } from '@/types'
import { api, ApiError } from '@/lib/api'

const ITEMS_PER_PAGE = 20

export function useInfiniteScroll() {
  const [items, setItems] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  const fetchItems = useCallback(async (pageNum: number) => {
    if (loading) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await api.getModels(pageNum, ITEMS_PER_PAGE)
      
      const newItems = response.data
      setItems(prev => pageNum === 1 ? newItems : [...prev, ...newItems])
      setHasMore(response.pagination.hasMore)
      
    } catch (error) {
      console.error('Error fetching models:', error)
      
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError('Failed to load models')
      }
      
      // If it's the first page and we get an error, show some fallback data
      if (pageNum === 1) {
        const fallbackItems: Model[] = Array.from({ length: 6 }, (_, index) => ({
          id: `fallback-${index + 1}`,
          name: `Sample Model ${index + 1}`,
          imageUrl: `https://picsum.photos/400/600?random=${index + 1}`,
          originalSource: 'Fallback Data',
          createdAt: new Date().toISOString()
        }))
        setItems(fallbackItems)
        setHasMore(false)
      }
    } finally {
      setLoading(false)
    }
  }, [loading])

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchItems(nextPage)
    }
  }, [hasMore, loading, page, fetchItems])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    )

    const currentLoadingRef = loadingRef.current
    if (currentLoadingRef) {
      observer.observe(currentLoadingRef)
    }

    return () => {
      if (currentLoadingRef) {
        observer.unobserve(currentLoadingRef)
      }
    }
  }, [hasMore, loading, loadMore])

  // Initial load
  useEffect(() => {
    if (items.length === 0) {
      fetchItems(1)
    }
  }, [items.length, fetchItems])

  const refetch = useCallback(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    setError(null)
    fetchItems(1)
  }, [fetchItems])

  return {
    items,
    loading,
    hasMore,
    error,
    containerRef,
    loadingRef,
    refetch
  }
}