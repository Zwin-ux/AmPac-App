import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { SyncStatus } from '../types';

interface SyncStatusBadgeProps {
    status: SyncStatus;
    lastSyncedAt?: number | null;
    compact?: boolean;
}

const STATUS_CONFIG: Record<SyncStatus, { icon: string; color: string; label: string }> = {
    idle: { icon: 'ellipse-outline', color: theme.colors.textSecondary, label: 'Not saved' },
    local: { icon: 'phone-portrait-outline', color: theme.colors.warning, label: 'Saved locally' },
    syncing: { icon: 'cloud-upload-outline', color: theme.colors.info, label: 'Syncing...' },
    synced: { icon: 'cloud-done-outline', color: theme.colors.success, label: 'Synced' },
    offline: { icon: 'cloud-offline-outline', color: theme.colors.warning, label: 'Offline' },
    error: { icon: 'alert-circle-outline', color: theme.colors.error, label: 'Sync error' },
};

export default function SyncStatusBadge({ status, lastSyncedAt, compact = false }: SyncStatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    
    const getTimeLabel = () => {
        if (!lastSyncedAt) return config.label;
        const seconds = Math.round((Date.now() - lastSyncedAt) / 1000);
        if (seconds < 5) return 'Just now';
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        return config.label;
    };

    if (compact) {
        return (
            <View style={[styles.compactContainer, { backgroundColor: config.color + '20' }]}>
                <Ionicons name={config.icon as any} size={14} color={config.color} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Ionicons name={config.icon as any} size={16} color={config.color} />
            <Text style={[styles.label, { color: config.color }]}>
                {status === 'synced' ? getTimeLabel() : config.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: theme.colors.background,
    },
    compactContainer: {
        padding: 4,
        borderRadius: 10,
    },
    label: {
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '500',
    },
});
