import React from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ListRenderItem,
  FlatListProps,
} from 'react-native';
import { useInfiniteScroll, useScrollHandler } from '../hooks/useInfiniteScroll';

interface InfiniteScrollListProps<T> extends Omit<FlatListProps<T>, 'data' | 'onEndReached' | 'refreshControl'> {
  fetchData: (page: number, pageSize: number) => Promise<T[]>;
  renderItem: ListRenderItem<T>;
  pageSize?: number;
  threshold?: number;
  emptyMessage?: string;
  errorMessage?: string;
  loadingComponent?: React.ReactNode;
  loadingMoreComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  onRefresh?: () => void;
  enabled?: boolean;
}

function InfiniteScrollList<T>({
  fetchData,
  renderItem,
  pageSize = 20,
  threshold = 0.8,
  emptyMessage = 'No items found',
  errorMessage = 'Something went wrong',
  loadingComponent,
  loadingMoreComponent,
  errorComponent,
  emptyComponent,
  onRefresh,
  enabled = true,
  ...flatListProps
}: InfiniteScrollListProps<T>) {
  const {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useInfiniteScroll(fetchData, {
    pageSize,
    threshold,
    enabled,
  });

  const { handleEndReached } = useScrollHandler(loadMore, hasMore, isLoadingMore, threshold);

  const handleRefresh = async () => {
    await refresh();
    onRefresh?.();
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    if (loadingMoreComponent) {
      return loadingMoreComponent;
    }

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#6B7280" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      if (loadingComponent) {
        return loadingComponent;
      }
      
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6B7280" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    if (error) {
      if (errorComponent) {
        return errorComponent;
      }
      
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.errorSubtext}>Pull to refresh</Text>
        </View>
      );
    }

    if (emptyComponent) {
      return emptyComponent;
    }

    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  };

  return (
    <FlatList
      {...flatListProps}
      data={data}
      renderItem={renderItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={threshold}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          colors={['#10B981']}
          tintColor="#10B981"
        />
      }
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
      getItemLayout={flatListProps.getItemLayout}
      keyExtractor={flatListProps.keyExtractor || ((item: any, index: number) => `item-${index}`)}
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 5,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default InfiniteScrollList;