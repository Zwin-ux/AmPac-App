import { useState, useEffect, useCallback, useRef } from 'react';

export interface InfiniteScrollOptions<T> {
  initialData?: T[];
  pageSize?: number;
  threshold?: number;
  enabled?: boolean;
}

export interface InfiniteScrollResult<T> {
  data: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export function useInfiniteScroll<T>(
  fetchFunction: (page: number, pageSize: number) => Promise<T[]>,
  options: InfiniteScrollOptions<T> = {}
): InfiniteScrollResult<T> {
  const {
    initialData = [],
    pageSize = 20,
    threshold = 0.8,
    enabled = true,
  } = options;

  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(0);

  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async (pageNum: number, isRefresh = false) => {
    if (!enabled || isLoadingRef.current) return;

    isLoadingRef.current = true;
    
    try {
      if (isRefresh) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      const newData = await fetchFunction(pageNum, pageSize);
      
      if (!isMountedRef.current) return;

      if (isRefresh) {
        setData(newData);
        setPage(1);
      } else {
        setData(prevData => [...prevData, ...newData]);
        setPage(pageNum + 1);
      }

      // Check if we have more data
      setHasMore(newData.length === pageSize);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const error = err as Error;
      setError(error);
      console.error('Error loading data:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
        isLoadingRef.current = false;
      }
    }
  }, [fetchFunction, pageSize, enabled]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingRef.current) return;
    await loadData(page, false);
  }, [loadData, page, hasMore]);

  const refresh = useCallback(async () => {
    setHasMore(true);
    await loadData(0, true);
  }, [loadData]);

  const reset = useCallback(() => {
    setData(initialData);
    setPage(0);
    setHasMore(true);
    setError(null);
    setIsLoading(false);
    setIsLoadingMore(false);
    isLoadingRef.current = false;
  }, [initialData]);

  // Initial load
  useEffect(() => {
    if (enabled && data.length === 0 && !isLoadingRef.current) {
      loadData(0, true);
    }
  }, [enabled, data.length, loadData]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    reset,
  };
}

/**
 * Hook for handling scroll events with infinite loading
 */
export function useScrollHandler(
  loadMore: () => Promise<void>,
  hasMore: boolean,
  isLoadingMore: boolean,
  threshold: number = 0.8
) {
  const handleScroll = useCallback((event: any) => {
    if (!hasMore || isLoadingMore) return;

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    const isCloseToBottom = 
      layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;

    if (isCloseToBottom) {
      loadMore();
    }
  }, [loadMore, hasMore, isLoadingMore]);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [loadMore, hasMore, isLoadingMore]);

  return {
    handleScroll,
    handleEndReached,
  };
}