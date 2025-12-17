import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Task } from '../types';
import { theme } from '../theme';
import { Card } from './ui/Card';
import { API_URL } from '../config';
import { getFirebaseIdToken } from '../services/brainAuth';

interface TaskListProps {
  tasks: Task[];
  onRefresh?: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onRefresh }) => {
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  const handleUpload = async (task: Task) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all types, or restrict to pdf/images
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setUploadingTaskId(task.id);

      // Create form data
      const formData = new FormData();
      formData.append('taskId', task.id);
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as any);

      // Upload to Brain
      const token = await getFirebaseIdToken();
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      Alert.alert('Success', 'Document uploaded successfully!');
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setUploadingTaskId(null);
    }
  };

  const openTasks = tasks.filter(t => t.status === 'open' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No pending tasks.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {openTasks.map(task => (
        <Card key={task.id} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{task.title}</Text>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.uploadButton} 
            onPress={() => handleUpload(task)}
            disabled={!!uploadingTaskId}
          >
            {uploadingTaskId === task.id ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.uploadButtonText}>Upload Document</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>
      ))}

      {completedTasks.length > 0 && (
        <View style={styles.completedSection}>
          <Text style={styles.sectionTitle}>Completed</Text>
          {completedTasks.map(task => (
            <View key={task.id} style={styles.completedItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.completedText}>{task.title}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
  },
  taskCard: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  completedSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  completedText: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
});
