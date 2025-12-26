import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { marketplaceService } from '../services/marketplace';
import type { MarketplaceItem } from '../types';
import EmptyState from '../components/ui/EmptyState';
import SkeletonLoader from '../components/SkeletonLoader';

type Category = 'All' | string;

export default function MarketplaceScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<MarketplaceItem[]>([]);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<Category>('All');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await marketplaceService.getItems();
                setItems(data);
            } catch (err) {
                console.error('Marketplace load failed', err);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const categories = useMemo(() => {
        const set = new Set<string>();
        items.forEach((i) => set.add(i.category || 'Other'));
        return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))] as Category[];
    }, [items]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items
            .filter((i) => (category === 'All' ? true : i.category === category))
            .filter((i) => (!q ? true : `${i.title} ${i.description} ${i.category}`.toLowerCase().includes(q)))
            .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
    }, [items, query, category]);

    const featured = useMemo(() => filtered.filter((i) => i.featured), [filtered]);

    const openUrl = async (url: string | undefined) => {
        if (!url) {
            Alert.alert('Info', 'No link available for this item.');
            return;
        }
        try {
            const supported = await Linking.canOpenURL(url);
            if (!supported) {
                Alert.alert('Error', 'Cannot open this link on your device.');
                return;
            }
            await Linking.openURL(url);
        } catch (err) {
            console.error('Marketplace open URL failed', url, err);
            Alert.alert('Error', 'Could not open the link. Please try again.');
        }
    };

    const renderItemRow = (item: MarketplaceItem) => (
        <TouchableOpacity
            key={item.id}
            style={styles.itemRow}
            onPress={() => openUrl(item.url)}
            activeOpacity={0.85}
        >
            <View style={styles.itemIcon}>
                <Ionicons name="bag-handle-outline" size={18} color={theme.colors.text} />
            </View>
            <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle} numberOfLines={2}>{item.description}</Text>
                <View style={styles.itemMeta}>
                    <Text style={styles.metaText}>{item.category}</Text>
                    {item.priceLabel ? <Text style={styles.metaDot}>•</Text> : null}
                    {item.priceLabel ? <Text style={styles.metaText}>{item.priceLabel}</Text> : null}
                </View>
            </View>
            {item.badge ? (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
            ) : null}
            <Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack?.()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Marketplace</Text>
                    <Text style={styles.subtitle}>Curated tools and partner offers from AmPac.</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Card style={styles.searchCard}>
                    <View style={styles.searchRow}>
                        <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search marketplace"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={query}
                            onChangeText={setQuery}
                            autoCapitalize="none"
                        />
                        {query ? (
                            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                        {categories.map((c) => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.chip, category === c && styles.chipActive]}
                                onPress={() => setCategory(c)}
                            >
                                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Card>

                {loading ? (
                    <View style={styles.listWrap}>
                        <Text style={styles.sectionLabel}>LOADING MARKETPLACE...</Text>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <View key={i} style={styles.skeletonRow}>
                                <SkeletonLoader width={36} height={36} borderRadius={theme.borderRadius.md} />
                                <View style={{ flex: 1, gap: 8 }}>
                                    <SkeletonLoader width="60%" height={16} />
                                    <SkeletonLoader width="90%" height={12} />
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <>
                        {featured.length > 0 && category === 'All' && !query && (
                            <View style={{ marginBottom: theme.spacing.lg }}>
                                <Text style={styles.sectionLabel}>FEATURED</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {featured.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.featureCard}
                                            onPress={() => openUrl(item.url)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.featureTitle}>{item.title}</Text>
                                            <Text style={styles.featureDesc} numberOfLines={3}>{item.description}</Text>
                                            <View style={styles.featureFooter}>
                                                <Text style={styles.featureMeta}>{item.category}</Text>
                                                <Ionicons name="arrow-forward" size={16} color={theme.colors.text} />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <Text style={styles.sectionLabel}>
                            {query || category !== 'All' ? `SEARCH RESULTS (${filtered.length})` : 'ALL ITEMS'}
                        </Text>
                        <View style={styles.listWrap}>
                            {filtered.length > 0 ? (
                                filtered.map(renderItemRow)
                            ) : (
                                <EmptyState
                                    title="No Items Found"
                                    description={query ? `We couldn't find anything matching "${query}". Try different keywords.` : "No items available in this category yet."}
                                    icon="search"
                                    actionLabel="Clear Filters"
                                    onAction={() => {
                                        setQuery('');
                                        setCategory('All');
                                    }}
                                />
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        ...theme.typography.h2,
    },
    subtitle: {
        ...theme.typography.caption,
        marginTop: 2,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    searchCard: {
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 10,
        gap: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        paddingVertical: 0,
    },
    clearBtn: {
        padding: 2,
    },
    chipsRow: {
        marginTop: theme.spacing.md,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.round,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        marginRight: 8,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    chipTextActive: {
        color: '#fff',
    },
    sectionLabel: {
        ...theme.typography.label as any,
        marginBottom: theme.spacing.sm,
        marginLeft: 2,
    },
    centered: {
        paddingVertical: theme.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureCard: {
        width: 260,
        marginRight: theme.spacing.md,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surface,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    featureDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginBottom: theme.spacing.md,
    },
    featureFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    featureMeta: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    listWrap: {
        gap: theme.spacing.sm,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.md,
    },
    itemIcon: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceHighlight,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemText: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: theme.colors.text,
        marginBottom: 2,
    },
    itemSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    metaDot: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.surfaceHighlight,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.sm,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        letterSpacing: 0.2,
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
});

