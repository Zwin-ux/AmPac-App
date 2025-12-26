import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { contentModerationService, ReportData } from '../services/contentModerationService';

interface ReportContentProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'message' | 'post' | 'comment' | 'user';
  reportedUserId: string;
  contentPreview?: string;
}

const REPORT_REASONS: Array<{ key: ReportData['reason']; label: string; description: string }> = [
  {
    key: 'spam',
    label: 'Spam',
    description: 'Unwanted promotional content or repetitive messages',
  },
  {
    key: 'harassment',
    label: 'Harassment',
    description: 'Bullying, threats, or targeted harassment',
  },
  {
    key: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Content that violates community standards',
  },
  {
    key: 'violence',
    label: 'Violence',
    description: 'Threats or promotion of violence',
  },
  {
    key: 'hate_speech',
    label: 'Hate Speech',
    description: 'Discriminatory language or hate speech',
  },
  {
    key: 'other',
    label: 'Other',
    description: 'Other violations not listed above',
  },
];

const ReportContent: React.FC<ReportContentProps> = ({
  visible,
  onClose,
  contentId,
  contentType,
  reportedUserId,
  contentPreview,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportData['reason'] | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);

    try {
      await contentModerationService.reportContent(
        contentId,
        contentType,
        reportedUserId,
        selectedReason,
        description.trim() || undefined
      );

      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We will review your report and take appropriate action.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert(
        'Error',
        'Failed to submit report. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Report Content</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why are you reporting this {contentType}?</Text>
            <Text style={styles.sectionDescription}>
              Your report helps us maintain a safe and respectful community.
            </Text>
          </View>

          {contentPreview && (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Content Preview:</Text>
              <View style={styles.previewContainer}>
                <Text style={styles.previewText} numberOfLines={3}>
                  {contentPreview}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.reasonsSection}>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.key}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.key && styles.reasonItemSelected,
                ]}
                onPress={() => setSelectedReason(reason.key)}
              >
                <View style={styles.reasonContent}>
                  <View style={styles.reasonHeader}>
                    <Text
                      style={[
                        styles.reasonLabel,
                        selectedReason === reason.key && styles.reasonLabelSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                    <View
                      style={[
                        styles.radioButton,
                        selectedReason === reason.key && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedReason === reason.key && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </View>
                  <Text style={styles.reasonDescription}>{reason.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>
              Additional Details (Optional)
            </Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Provide additional context about why you're reporting this content..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {description.length}/500 characters
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !selectedReason && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  previewContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  reasonsSection: {
    marginBottom: 20,
  },
  reasonItem: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  reasonItemSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  reasonContent: {
    padding: 16,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  reasonLabelSelected: {
    color: '#10B981',
  },
  reasonDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#10B981',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReportContent;