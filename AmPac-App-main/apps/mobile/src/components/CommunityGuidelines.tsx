import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { contentModerationService } from '../services/contentModerationService';

interface CommunityGuidelinesProps {
  visible: boolean;
  onClose: () => void;
}

const CommunityGuidelines: React.FC<CommunityGuidelinesProps> = ({
  visible,
  onClose,
}) => {
  const guidelines = contentModerationService.getCommunityGuidelines();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Community Guidelines</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.introSection}>
            <Text style={styles.introTitle}>Welcome to AmPac Business Capital Community</Text>
            <Text style={styles.introText}>
              Our community is designed to help entrepreneurs connect, learn, and grow together. 
              To ensure a positive experience for everyone, please follow these guidelines:
            </Text>
          </View>

          <View style={styles.guidelinesSection}>
            <Text style={styles.sectionTitle}>Community Standards</Text>
            {guidelines.map((guideline, index) => (
              <View key={index} style={styles.guidelineItem}>
                <View style={styles.guidelineNumber}>
                  <Text style={styles.guidelineNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.guidelineText}>{guideline}</Text>
              </View>
            ))}
          </View>

          <View style={styles.consequencesSection}>
            <Text style={styles.sectionTitle}>Consequences of Violations</Text>
            <Text style={styles.consequencesText}>
              Violations of these guidelines may result in:
            </Text>
            <View style={styles.consequencesList}>
              <Text style={styles.consequenceItem}>• Warning and content removal</Text>
              <Text style={styles.consequenceItem}>• Temporary suspension of account</Text>
              <Text style={styles.consequenceItem}>• Permanent ban from the community</Text>
              <Text style={styles.consequenceItem}>• Reporting to relevant authorities (if illegal activity)</Text>
            </View>
          </View>

          <View style={styles.reportingSection}>
            <Text style={styles.sectionTitle}>Reporting Violations</Text>
            <Text style={styles.reportingText}>
              If you encounter content or behavior that violates these guidelines:
            </Text>
            <View style={styles.reportingSteps}>
              <View style={styles.reportingStep}>
                <Ionicons name="flag" size={20} color="#EF4444" />
                <Text style={styles.reportingStepText}>
                  Use the report feature on any post, message, or profile
                </Text>
              </View>
              <View style={styles.reportingStep}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={styles.reportingStepText}>
                  Our moderation team will review your report within 24 hours
                </Text>
              </View>
              <View style={styles.reportingStep}>
                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                <Text style={styles.reportingStepText}>
                  Appropriate action will be taken to maintain community safety
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Need Help?</Text>
            <Text style={styles.contactText}>
              If you have questions about these guidelines or need to report a serious issue, 
              please contact our support team at:
            </Text>
            <Text style={styles.contactEmail}>support@ampac.com</Text>
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              These guidelines are subject to change. We will notify the community of any 
              significant updates. Last updated: December 2024
            </Text>
          </View>
        </ScrollView>
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
  introSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  introText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  guidelinesSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  guidelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  guidelineNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  guidelineNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  guidelineText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  consequencesSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  consequencesText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 12,
  },
  consequencesList: {
    paddingLeft: 16,
  },
  consequenceItem: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 8,
  },
  reportingSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reportingText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  reportingSteps: {
    paddingLeft: 8,
  },
  reportingStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reportingStepText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginLeft: 12,
  },
  contactSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 12,
  },
  contactEmail: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
  },
  footerSection: {
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default CommunityGuidelines;