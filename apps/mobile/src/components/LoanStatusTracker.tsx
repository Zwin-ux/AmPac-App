import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ApplicationStatus } from '../types';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface LoanStatusTrackerProps {
  status: ApplicationStatus;
  venturesStatus?: string;
}

const STAGES: { id: string; label: string; statuses: ApplicationStatus[] }[] = [
  { id: 'draft', label: 'Draft', statuses: ['draft', 'quick_draft'] },
  { id: 'submitted', label: 'Submitted', statuses: ['submitted'] },
  { id: 'review', label: 'Underwriting', statuses: ['in_review', 'conditional_approval'] },
  { id: 'approved', label: 'Approved', statuses: ['sba_submitted', 'sba_approved', 'closing'] },
  { id: 'funded', label: 'Funded', statuses: ['funded'] },
];

export const LoanStatusTracker: React.FC<LoanStatusTrackerProps> = ({ status, venturesStatus }) => {
  const currentStageIndex = STAGES.findIndex(stage => stage.statuses.includes(status));
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStageIndex,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [currentStageIndex]);

  // Calculate width percentage: (index / (total - 1)) * 100
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, STAGES.length - 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loan Status</Text>
        {venturesStatus && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{venturesStatus}</Text>
          </View>
        )}
      </View>

      <View style={styles.trackerContainer}>
        {/* Background Line */}
        <View style={styles.lineBackground} />
        
        {/* Active Progress Line */}
        <Animated.View style={[styles.lineProgress, { width: progressWidth }]} />

        {/* Stages */}
        <View style={styles.stagesContainer}>
          {STAGES.map((stage, index) => {
            const isActive = index <= currentStageIndex;
            const isCurrent = index === currentStageIndex;

            return (
              <View key={stage.id} style={styles.stageWrapper}>
                <View style={[styles.dot, isActive && styles.activeDot, isCurrent && styles.currentDot]}>
                  {isActive && <Ionicons name="checkmark" size={12} color="white" />}
                </View>
                <Text style={[styles.stageLabel, isActive && styles.activeLabel]}>
                  {stage.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  trackerContainer: {
    position: 'relative',
    height: 60,
    justifyContent: 'center',
  },
  lineBackground: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  lineProgress: {
    position: 'absolute',
    top: 10,
    left: 0,
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  stagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    width: '100%',
    top: 0,
  },
  stageWrapper: {
    alignItems: 'center',
    width: 60, 
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
  },
  currentDot: {
    transform: [{ scale: 1.2 }],
    borderColor: theme.colors.primary,
    backgroundColor: 'white',
    borderWidth: 4,
  },
  stageLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  activeLabel: {
    color: theme.colors.text,
    fontWeight: '600',
  },
});
