import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { uploadManager, UploadJob } from '../services/uploadManager';

export default function BackgroundUploadIndicator() {
    const [jobs, setJobs] = useState<UploadJob[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        const unsubscribe = uploadManager.subscribe(setJobs);
        return unsubscribe;
    }, []);

    // Pulse animation when uploading
    useEffect(() => {
        const activeJobs = jobs.filter(j => j.status === 'uploading' || j.status === 'queued');
        if (activeJobs.length > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [jobs, pulseAnim]);

    const counts = uploadManager.getCounts();
    const hasActiveUploads = counts.uploading > 0;
    const hasFailedUploads = counts.failed > 0;

    // Don't show if no jobs
    if (counts.total === 0) return null;

    // Auto-hide completed uploads after 3 seconds
    const visibleJobs = jobs.filter(j => 
        j.status !== 'completed' || (Date.now() - j.createdAt < 3000)
    );

    if (visibleJobs.length === 0) return null;

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={[
                    styles.badge,
                    hasFailedUploads && styles.badgeFailed,
                ]}
                onPress={() => setExpanded(!expanded)}
            >
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Ionicons 
                        name={hasActiveUploads ? "cloud-upload" : hasFailedUploads ? "alert-circle" : "checkmark-circle"} 
                        size={18} 
                        color="#fff" 
                    />
                </Animated.View>
                <Text style={styles.badgeText}>
                    {hasActiveUploads 
                        ? `Uploading ${counts.uploading}...` 
                        : hasFailedUploads 
                            ? `${counts.failed} failed`
                            : 'Uploads complete'}
                </Text>
                <Ionicons 
                    name={expanded ? "chevron-down" : "chevron-up"} 
                    size={16} 
                    color="#fff" 
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedList}>
                    {visibleJobs.map(job => (
                        <View key={job.id} style={styles.jobRow}>
                            <Ionicons 
                                name={
                                    job.status === 'completed' ? 'checkmark-circle' :
                                    job.status === 'failed' ? 'alert-circle' :
                                    job.status === 'uploading' ? 'cloud-upload' : 'time'
                                }
                                size={16}
                                color={
                                    job.status === 'completed' ? theme.colors.success :
                                    job.status === 'failed' ? theme.colors.error :
                                    theme.colors.info
                                }
                            />
                            <Text style={styles.jobName} numberOfLines={1}>{job.fileName}</Text>
                            {job.status === 'uploading' && (
                                <Text style={styles.jobProgress}>{job.progress}%</Text>
                            )}
                            {job.status === 'failed' && (
                                <TouchableOpacity onPress={() => uploadManager.retry(job.id)}>
                                    <Text style={styles.retryText}>Retry</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: 16,
        zIndex: 1000,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.info,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        ...theme.shadows.float,
    },
    badgeFailed: {
        backgroundColor: theme.colors.error,
    },
    badgeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    expandedList: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        marginTop: 8,
        padding: 8,
        ...theme.shadows.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 200,
    },
    jobRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        gap: 8,
    },
    jobName: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.text,
    },
    jobProgress: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    retryText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '600',
    },
});
