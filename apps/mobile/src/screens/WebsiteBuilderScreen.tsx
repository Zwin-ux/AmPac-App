import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, SafeAreaView, StyleSheet, Alert, Share, Switch } from 'react-native';
import { WebView } from 'react-native-webview';
import { websiteService } from '../services/websiteService';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { cacheService } from '../services/cache';
import * as DocumentPicker from 'expo-document-picker';

const primaryBlue = "#0064A6";
const DRAFT_CACHE_KEY = 'websiteBuilderDraft';

export default function WebsiteBuilderScreen({ navigation }: any) {
    const [step, setStep] = useState<'input' | 'generating' | 'preview' | 'published'>('input');
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        zip: '',
        description: '',
        phone: '',
        email: '',
        palette: 'modern',
        font: 'sans',
        contactCta: 'Call',
        social: {
            instagram: '',
            facebook: '',
            linkedin: ''
        },
        logoUrl: '',
        heroUrl: '',
        gallery: [] as string[],
    });
    const [selectedTemplate, setSelectedTemplate] = useState<string>('local-hero');
    const [generatedHtml, setGeneratedHtml] = useState<string>('');
    const [generatedSections, setGeneratedSections] = useState<any>(null);
    const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
    const [error, setError] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [publicUrl, setPublicUrl] = useState<string | null>(null);
    const [useBusinessPlan, setUseBusinessPlan] = useState(false);

    // Editing state
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [lastSaved, setLastSaved] = useState<number | null>(null);
    const [draftHydrated, setDraftHydrated] = useState(false);

    useEffect(() => {
        const hydrateDraft = async () => {
            const cached = await cacheService.get<{
                formData: typeof formData;
                selectedTemplate: string;
                generatedHtml: string;
                generatedSections: any;
                publicUrl: string | null;
            }>(DRAFT_CACHE_KEY, Infinity);
            if (cached) {
                setFormData(cached.formData);
                setSelectedTemplate(cached.selectedTemplate);
                setGeneratedHtml(cached.generatedHtml || '');
                setGeneratedSections(cached.generatedSections || null);
                if (cached.generatedHtml) setStep('preview');
                setPublicUrl(cached.publicUrl || null);
                setLastSaved(Date.now());
            }
            setDraftHydrated(true);
        };
        hydrateDraft();
    }, []);

    useEffect(() => {
        if (!draftHydrated) return;
        const timeout = setTimeout(() => {
            cacheService.set(DRAFT_CACHE_KEY, {
                formData,
                selectedTemplate,
                generatedHtml,
                generatedSections,
                publicUrl
            });
            setLastSaved(Date.now());
        }, 500);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, selectedTemplate, generatedHtml, generatedSections, publicUrl, draftHydrated]);

    const handleGenerate = async () => {
        if (!formData.name || !formData.description) {
            setError("Please fill in at least the Business Name and Description.");
            return;
        }

        setStep('generating');
        setError(null);

        try {
            const result = await websiteService.generateWebsite({
                ...formData,
                hasBusinessPlan: useBusinessPlan,
                template: selectedTemplate
            });
            setGeneratedHtml(result.html);
            setGeneratedSections(result.sections);
            setStep('preview');
        } catch (err: any) {
            setError(err.message || "Failed to generate website. Please try again.");
            setStep('input');
        }
    };

    const handlePublish = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Error", "You must be logged in to publish.");
            return;
        }

        setPublishing(true);
        try {
            const result = await websiteService.publishWebsite({
                businessId: user.uid, // Using user ID as business ID for now
                ownerId: user.uid,
                htmlContent: generatedHtml,
                sections: generatedSections,
                template: selectedTemplate,
                palette: formData.palette,
                font: formData.font,
                contactCta: formData.contactCta,
                social: formData.social,
                slug: formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : undefined,
            });
            setPublicUrl(result.url);
            setStep('published');
        } catch (err: any) {
            Alert.alert("Publishing Failed", err.message || "Could not publish website.");
        } finally {
            setPublishing(false);
        }
    };

    const handleRegenerateSection = async () => {
        if (!editingSection || !editInstruction) return;

        setIsRegenerating(true);
        try {
            const result = await websiteService.regenerateSection({
                sectionName: editingSection,
                currentData: generatedSections[editingSection],
                instruction: editInstruction,
                allSections: generatedSections
            });

            // Update state with new data
            setGeneratedSections((prev: any) => ({
                ...prev,
                [editingSection]: result.sectionData
            }));
            setGeneratedHtml(result.html);

            // Close modal
            setEditingSection(null);
            setEditInstruction('');
        } catch (err: any) {
            Alert.alert("Update Failed", err.message || "Could not update section.");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleShare = async () => {
        if (publicUrl) {
            await Share.share({
                message: `Check out my new business website! ${publicUrl}`,
                url: publicUrl
            });
        }
    };

    const themePresets = [
        { id: 'modern', name: 'Modern Blue', primary: '#0F172A', accent: '#22C55E' },
        { id: 'sunrise', name: 'Sunrise', primary: '#7C3AED', accent: '#F97316' },
        { id: 'earth', name: 'Earth', primary: '#0B3C49', accent: '#E3B448' },
    ];

    const fontPresets = [
        { id: 'sans', label: 'Sans (Workmanlike)' },
        { id: 'serif', label: 'Serif (Editorial)' },
        { id: 'rounded', label: 'Rounded (Friendly)' },
    ];

    const templates = [
        { id: 'local-hero', label: 'Local Hero', desc: 'Service-forward with testimonials.' },
        { id: 'product', label: 'Product Spotlight', desc: 'Hero + features + pricing.' },
        { id: 'story', label: 'Founder Story', desc: 'Narrative + team + CTA.' },
    ];

    const slugFromName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const uploadAsset = async (type: 'logo' | 'hero' | 'gallery') => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Login required', 'Please sign in before uploading assets.');
            return;
        }
        const picker = await DocumentPicker.getDocumentAsync({
            type: 'image/*',
            copyToCacheDirectory: true,
            multiple: false,
        });
        if (picker.canceled || !picker.assets?.length) return;
        const file = picker.assets[0];
        const slug = slugFromName(formData.name || user.uid);
        try {
            const uploadInfo = await websiteService.uploadAsset({
                fileName: file.name || `${type}.jpg`,
                contentType: file.mimeType || 'image/jpeg',
                siteId: user.uid,
                slug,
                type,
            });

            const blob = await (await fetch(file.uri)).blob();
            await fetch(uploadInfo.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.mimeType || 'application/octet-stream' },
                body: blob,
            });

            if (type === 'logo') {
                setFormData(prev => ({ ...prev, logoUrl: uploadInfo.publicUrl }));
            } else if (type === 'hero') {
                setFormData(prev => ({ ...prev, heroUrl: uploadInfo.publicUrl }));
            } else {
                setFormData(prev => ({ ...prev, gallery: [...prev.gallery, uploadInfo.publicUrl] }));
            }
        } catch (err: any) {
            console.error('Asset upload failed', err);
            Alert.alert('Upload failed', err?.message || 'Could not upload file.');
        }
    };

    const renderInputStep = () => (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.mainBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.title}>Build Your Website</Text>
                <Text style={styles.subtitle}>
                    Tell us about your business, and our AI will design a professional landing page for you in seconds.
                </Text>
            </View>

            {error && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <View style={styles.card}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Business Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.name}
                        onChangeText={(t) => setFormData({ ...formData, name: t })}
                        placeholder="e.g. Joe's Coffee"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Industry</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.industry}
                        onChangeText={(t) => setFormData({ ...formData, industry: t })}
                        placeholder="e.g. Cafe, Plumber, Consultant"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Zip Code</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.zip}
                        onChangeText={(t) => setFormData({ ...formData, zip: t })}
                        placeholder="e.g. 90210"
                        keyboardType="number-pad"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Describe your vibe & services *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.description}
                        onChangeText={(t) => setFormData({ ...formData, description: t })}
                        placeholder="e.g. A cozy, modern coffee shop specializing in fair-trade beans. We also offer pastries and catering."
                        multiline
                        numberOfLines={4}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.phone}
                        onChangeText={(t) => setFormData({ ...formData, phone: t })}
                        placeholder="(555) 123-4567"
                        keyboardType="phone-pad"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.email}
                        onChangeText={(t) => setFormData({ ...formData, email: t })}
                        placeholder="hello@business.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Template</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {templates.map((tpl) => (
                            <TouchableOpacity
                                key={tpl.id}
                                style={[styles.pill, selectedTemplate === tpl.id && styles.pillActive]}
                                onPress={() => setSelectedTemplate(tpl.id)}
                            >
                                <Text style={[styles.pillText, selectedTemplate === tpl.id && styles.pillTextActive]}>
                                    {tpl.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <Text style={styles.helperText}>Preconfigured section order and defaults.</Text>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Theme Colors</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {themePresets.map((preset) => (
                            <TouchableOpacity
                                key={preset.id}
                                style={[
                                    styles.pill,
                                    formData.palette === preset.id && styles.pillActive,
                                    { flexDirection: 'row', alignItems: 'center' }
                                ]}
                                onPress={() => setFormData({ ...formData, palette: preset.id })}
                            >
                                <View style={[styles.swatch, { backgroundColor: preset.primary }]} />
                                <View style={[styles.swatch, { backgroundColor: preset.accent, marginLeft: 6 }]} />
                                <Text style={[styles.pillText, formData.palette === preset.id && styles.pillTextActive, { marginLeft: 6 }]}>
                                    {preset.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Typography</Text>
                    <View style={styles.row}>
                        {fontPresets.map((font) => (
                            <TouchableOpacity
                                key={font.id}
                                style={[styles.pill, formData.font === font.id && styles.pillActive, { flex: 1 }]}
                                onPress={() => setFormData({ ...formData, font: font.id })}
                            >
                                <Text style={[styles.pillText, formData.font === font.id && styles.pillTextActive]}>{font.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Contact CTA</Text>
                    <View style={styles.row}>
                        {['Call', 'Email', 'Book Meeting'].map((cta) => (
                            <TouchableOpacity
                                key={cta}
                                style={[styles.pill, formData.contactCta === cta && styles.pillActive, { flex: 1 }]}
                                onPress={() => setFormData({ ...formData, contactCta: cta })}
                            >
                                <Text style={[styles.pillText, formData.contactCta === cta && styles.pillTextActive]}>{cta}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Social (optional)</Text>
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.inputInline]}
                            value={formData.social.instagram}
                            onChangeText={(t) => setFormData({ ...formData, social: { ...formData.social, instagram: t } })}
                            placeholder="Instagram handle"
                            placeholderTextColor="#9CA3AF"
                        />
                        <TextInput
                            style={[styles.input, styles.inputInline]}
                            value={formData.social.facebook}
                            onChangeText={(t) => setFormData({ ...formData, social: { ...formData.social, facebook: t } })}
                            placeholder="Facebook URL"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                    <TextInput
                        style={[styles.input, { marginTop: 12 }]}
                        value={formData.social.linkedin}
                        onChangeText={(t) => setFormData({ ...formData, social: { ...formData.social, linkedin: t } })}
                        placeholder="LinkedIn URL"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Brand Assets</Text>
                    <View style={[styles.row, { flexWrap: 'wrap' }]}>
                        <TouchableOpacity style={[styles.pill, styles.assetPill]} onPress={() => uploadAsset('logo')}>
                            <Ionicons name="image" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                            <Text style={styles.pillText}>Upload Logo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.pill, styles.assetPill]} onPress={() => uploadAsset('hero')}>
                            <Ionicons name="image-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                            <Text style={styles.pillText}>Upload Hero</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.pill, styles.assetPill]} onPress={() => uploadAsset('gallery')}>
                            <Ionicons name="images-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                            <Text style={styles.pillText}>Add Gallery</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.assetPreviewRow}>
                        {formData.logoUrl ? (
                            <View style={styles.assetBadge}>
                                <Text style={styles.assetLabel}>Logo</Text>
                                <Text style={styles.assetUrl} numberOfLines={1}>{formData.logoUrl}</Text>
                            </View>
                        ) : null}
                        {formData.heroUrl ? (
                            <View style={styles.assetBadge}>
                                <Text style={styles.assetLabel}>Hero</Text>
                                <Text style={styles.assetUrl} numberOfLines={1}>{formData.heroUrl}</Text>
                            </View>
                        ) : null}
                        {formData.gallery.slice(0, 3).map((url, idx) => (
                            <View key={idx} style={styles.assetBadge}>
                                <Text style={styles.assetLabel}>Gallery</Text>
                                <Text style={styles.assetUrl} numberOfLines={1}>{url}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            <View style={styles.switchContainer}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Use Business Plan Context</Text>
                    <Text style={styles.helperText}>
                        We'll analyze your uploaded documents to personalize the content.
                    </Text>
                    {lastSaved && (
                        <Text style={[styles.helperText, { marginTop: 8 }]}>
                            Draft saved {new Date(lastSaved).toLocaleTimeString()}
                        </Text>
                    )}
                </View>
                <Switch
                    value={useBusinessPlan}
                    onValueChange={setUseBusinessPlan}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={useBusinessPlan ? primaryBlue : '#f4f3f4'}
                />
            </View>

            <View style={styles.row}>
                <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={handleGenerate}>
                    <Text style={styles.buttonText}>Generate Website</Text>
                    <Ionicons name="sparkles" size={20} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 0.4, marginLeft: 12 }]}
                    onPress={() => {
                        setFormData({
                            name: '',
                            industry: '',
                            zip: '',
                            description: '',
                            phone: '',
                            email: '',
                            palette: 'modern',
                            font: 'sans',
                            contactCta: 'Call',
                            social: { instagram: '', facebook: '', linkedin: '' }
                        });
                        setSelectedTemplate('local-hero');
                        setGeneratedHtml('');
                        setGeneratedSections(null);
                        setPublicUrl(null);
                        setStep('input');
                        setLastSaved(null);
                        cacheService.remove(DRAFT_CACHE_KEY);
                    }}
                >
                    <Text style={styles.secondaryButtonText}>Clear Draft</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderGeneratingStep = () => (
        <View style={[styles.container, styles.center]}>
            <ActivityIndicator size="large" color={primaryBlue} />
            <Text style={[styles.title, { marginTop: 20 }]}>Designing your site...</Text>
            <Text style={styles.subtitle}>Our AI is writing copy and arranging layouts.</Text>
        </View>
    );

    const renderPreviewStep = () => (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <SafeAreaView style={{ backgroundColor: 'white' }}>
                <View style={styles.previewHeader}>
                    <TouchableOpacity onPress={() => setStep('input')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                        <Text style={styles.backButtonText}>Edit Info</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitleText}>Preview</Text>
                    <TouchableOpacity
                        style={[styles.publishButton, publishing && { opacity: 0.7 }]}
                        onPress={handlePublish}
                        disabled={publishing}
                    >
                        {publishing ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={styles.publishButtonText}>Publish</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Edit Controls */}
            <View style={styles.editControls}>
                <View style={styles.editRow}>
                    <View>
                        <Text style={styles.editLabel}>TAP TO REGENERATE SECTION:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                            {['hero', 'services', 'about', 'testimonials', 'contact'].map((section) => (
                                <TouchableOpacity
                                    key={section}
                                    style={styles.sectionChip}
                                    onPress={() => setEditingSection(section)}
                                >
                                    <Text style={styles.chipText}>{section.charAt(0).toUpperCase() + section.slice(1)}</Text>
                                    <Ionicons name="refresh-circle" size={18} color="#0064A6" style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    <View style={styles.deviceToggle}>
                        <TouchableOpacity
                            style={[styles.deviceButton, previewDevice === 'mobile' && styles.deviceButtonActive]}
                            onPress={() => setPreviewDevice('mobile')}
                        >
                            <Ionicons name="phone-portrait-outline" size={18} color={previewDevice === 'mobile' ? 'white' : '#475569'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.deviceButton, previewDevice === 'desktop' && styles.deviceButtonActive]}
                            onPress={() => setPreviewDevice('desktop')}
                        >
                            <Ionicons name="desktop-outline" size={18} color={previewDevice === 'desktop' ? 'white' : '#475569'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <WebView
                originWhitelist={['*']}
                source={{ html: generatedHtml }}
                style={{ flex: 1, marginHorizontal: previewDevice === 'desktop' ? 24 : 0 }}
            />

            {renderEditModal()}
        </View>
    );

    const renderEditModal = () => (
        <Modal
            visible={!!editingSection}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setEditingSection(null)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Regenerate {editingSection ? editingSection.charAt(0).toUpperCase() + editingSection.slice(1) : ''}
                        </Text>
                        <TouchableOpacity onPress={() => setEditingSection(null)} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalSubtitle}>
                        What would you like to change?
                    </Text>

                    <TextInput
                        style={[styles.input, styles.textArea, { height: 120, marginBottom: 20 }]}
                        value={editInstruction}
                        onChangeText={setEditInstruction}
                        placeholder="e.g. Make the headline more punchy, or change the background color description."
                        multiline
                        autoFocus
                        placeholderTextColor="#9CA3AF"
                    />

                    <TouchableOpacity
                        style={[styles.button, isRegenerating && { opacity: 0.7 }]}
                        onPress={handleRegenerateSection}
                        disabled={isRegenerating}
                    >
                        {isRegenerating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>Update Section</Text>
                                <Ionicons name="refresh" size={20} color="white" style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderPublishedStep = () => (
        <View style={[styles.container, styles.center]}>
            <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={48} color="#10B981" />
            </View>
            <Text style={styles.title}>You're Live!</Text>
            <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 32 }]}>
                Your website has been published and is ready to share with the world.
            </Text>

            <View style={styles.urlContainer}>
                <Text style={styles.urlLabel}>PUBLIC URL</Text>
                <Text style={styles.urlText}>{publicUrl}</Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleShare}>
                <Text style={styles.buttonText}>Share Link</Text>
                <Ionicons name="share-outline" size={20} color="white" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7FA' }}>
            {step === 'input' && renderInputStep()}
            {step === 'generating' && renderGeneratingStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'published' && renderPublishedStep()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 24,
    },
    mainBackButton: {
        marginBottom: 16,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        lineHeight: 24,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1E293B',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: primaryBlue,
        padding: 18,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: primaryBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    errorBox: {
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
    },
    previewHeader: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: 'white',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    backButtonText: {
        marginLeft: 4,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    headerTitleText: {
        fontWeight: '600',
        fontSize: 16,
        color: '#1E293B',
    },
    publishButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
    },
    publishButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    editControls: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    editLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    chipText: {
        fontSize: 14,
        color: '#0369A1',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 340,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    closeButton: {
        padding: 4,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 16,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    helperText: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
        marginRight: 16,
        lineHeight: 18,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 8,
        marginTop: 8,
    },
    pillActive: {
        backgroundColor: '#E0F2FE',
        borderColor: '#38BDF8',
    },
    pillText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '600',
    },
    pillTextActive: {
        color: '#0F172A',
    },
    swatch: {
        width: 14,
        height: 14,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inputInline: {
        flex: 1,
        marginRight: 8,
    },
    editRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    deviceToggle: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    deviceButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    deviceButtonActive: {
        backgroundColor: '#0F172A',
    },
    assetPill: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    assetPreviewRow: {
        marginTop: 12,
        gap: 8,
    },
    assetBadge: {
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    assetLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    assetUrl: {
        fontSize: 12,
        color: '#64748B',
        maxWidth: 240,
    },
    successIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    urlContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: '100%',
        marginBottom: 32,
        alignItems: 'center',
    },
    urlLabel: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    urlText: {
        color: primaryBlue,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    secondaryButton: {
        backgroundColor: 'white',
        padding: 18,
        borderRadius: 14,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    secondaryButtonText: {
        color: '#334155',
        fontSize: 16,
        fontWeight: '600',
    },
});
