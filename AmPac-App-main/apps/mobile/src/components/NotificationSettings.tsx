import React from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPreferences } from '../services/pushNotificationService';

const NotificationSettings: React.FC = () => {
  const { preferences, updatePreferences } = useNotifications();

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    try {
      const newPreferences = { ...preferences, [key]: value };
      await updatePreferences(newPreferences);
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification preferences');
    }
  };

  if (!preferences) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>
          Choose what notifications you'd like to receive
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Enable or disable all push notifications
            </Text>
          </View>
          <Switch
            value={preferences.pushEnabled}
            onValueChange={(value) => handleToggle('pushEnabled', value)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={preferences.pushEnabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>

        <View style={[styles.settingItem, !preferences.pushEnabled && styles.disabled]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, !preferences.pushEnabled && styles.disabledText]}>
              Direct Messages
            </Text>
            <Text style={[styles.settingDescription, !preferences.pushEnabled && styles.disabledText]}>
              Get notified when you receive new messages
            </Text>
          </View>
          <Switch
            value={preferences.messages && preferences.pushEnabled}
            onValueChange={(value) => handleToggle('messages', value)}
            disabled={!preferences.pushEnabled}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={preferences.messages && preferences.pushEnabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>

        <View style={[styles.settingItem, !preferences.pushEnabled && styles.disabled]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, !preferences.pushEnabled && styles.disabledText]}>
              Application Updates
            </Text>
            <Text style={[styles.settingDescription, !preferences.pushEnabled && styles.disabledText]}>
              Get notified about loan application status changes
            </Text>
          </View>
          <Switch
            value={preferences.applications && preferences.pushEnabled}
            onValueChange={(value) => handleToggle('applications', value)}
            disabled={!preferences.pushEnabled}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={preferences.applications && preferences.pushEnabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>

        <View style={[styles.settingItem, !preferences.pushEnabled && styles.disabled]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, !preferences.pushEnabled && styles.disabledText]}>
              Community Activity
            </Text>
            <Text style={[styles.settingDescription, !preferences.pushEnabled && styles.disabledText]}>
              Get notified about posts, comments, and community events
            </Text>
          </View>
          <Switch
            value={preferences.community && preferences.pushEnabled}
            onValueChange={(value) => handleToggle('community', value)}
            disabled={!preferences.pushEnabled}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={preferences.community && preferences.pushEnabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>

        <View style={[styles.settingItem, !preferences.pushEnabled && styles.disabled]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, !preferences.pushEnabled && styles.disabledText]}>
              Marketing & Updates
            </Text>
            <Text style={[styles.settingDescription, !preferences.pushEnabled && styles.disabledText]}>
              Get notified about new features and promotional offers
            </Text>
          </View>
          <Switch
            value={preferences.marketing && preferences.pushEnabled}
            onValueChange={(value) => handleToggle('marketing', value)}
            disabled={!preferences.pushEnabled}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={preferences.marketing && preferences.pushEnabled ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          You can change these settings at any time. Some notifications may still appear 
          for important account or security updates.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    paddingVertical: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  footer: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default NotificationSettings;