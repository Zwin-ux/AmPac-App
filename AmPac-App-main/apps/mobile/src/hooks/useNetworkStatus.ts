import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWifiEnabled?: boolean;
  strength?: number;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then(state => {
      updateNetworkStatus(state);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      updateNetworkStatus(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateNetworkStatus = (state: NetInfoState) => {
    const status: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type,
      isWifiEnabled: state.isWifiEnabled,
    };

    // Add connection strength for cellular
    if (state.type === 'cellular' && state.details) {
      status.strength = (state.details as any).strength;
    }

    setNetworkStatus(status);
    setIsOnline(status.isConnected && status.isInternetReachable);
    setConnectionType(status.type);
  };

  const refresh = async (): Promise<NetworkStatus> => {
    try {
      const state = await NetInfo.fetch();
      updateNetworkStatus(state);
      return networkStatus;
    } catch (error) {
      console.error('Error refreshing network status:', error);
      return networkStatus;
    }
  };

  return {
    networkStatus,
    isOnline,
    connectionType,
    refresh,
    // Convenience getters
    isConnected: networkStatus.isConnected,
    isInternetReachable: networkStatus.isInternetReachable,
    isWifi: networkStatus.type === 'wifi',
    isCellular: networkStatus.type === 'cellular',
    isEthernet: networkStatus.type === 'ethernet',
  };
};