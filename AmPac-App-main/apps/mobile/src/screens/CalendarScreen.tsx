/**
 * CalendarScreen
 * 
 * Personal calendar with month/week/day views,
 * community event syncing, and loan milestone tracking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    ActivityIndicator,
    FlatList,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { CalendarEvent, CalendarEventType, RecurrencePattern } from '../types';
import { personalCalendarService, EVENT_COLORS } from '../services/personalCalendarService';

// Use theme colors
const COLORS = {
    primary: theme.colors.primary,
    text: theme.colors.text,
    muted: theme.colors.textSecondary,
    background: theme.colors.background,
    surface: theme.colors.surface,
    border: theme.colors.border,
    danger: theme.colors.error,
    success: theme.colors.success
};

type ViewMode = 'month' | 'week' | 'agenda';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarDayProps {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    events: CalendarEvent[];
    onPress: () => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
    date,
    isCurrentMonth,
    isToday,
    isSelected,
    events,
    onPress
}) => {
    const maxDots = 3;
    const eventDots = events.slice(0, maxDots);

    return (
        <TouchableOpacity
            style={[
                styles.dayCell,
                !isCurrentMonth && styles.dayOtherMonth,
                isToday && styles.dayToday,
                isSelected && styles.daySelected
            ]}
            onPress={onPress}
        >
            <Text
                style={[
                    styles.dayNumber,
                    !isCurrentMonth && styles.dayNumberOther,
                    isToday && styles.dayNumberToday,
                    isSelected && styles.dayNumberSelected
                ]}
            >
                {date.getDate()}
            </Text>
            <View style={styles.eventDots}>
                {eventDots.map((event, idx) => (
                    <View
                        key={idx}
                        style={[
                            styles.eventDot,
                            { backgroundColor: event.color || EVENT_COLORS[event.type] }
                        ]}
                    />
                ))}
            </View>
        </TouchableOpacity>
    );
};

interface EventCardProps {
    event: CalendarEvent;
    onPress: () => void;
    onDelete: () => void;
    compact?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, onPress, onDelete, compact }) => {
    const startDate = event.startDate instanceof Timestamp
        ? event.startDate.toDate()
        : new Date();

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const getTypeIcon = (type: CalendarEventType) => {
        switch (type) {
            case 'personal': return 'calendar';
            case 'community': return 'people';
            case 'loan_milestone': return 'document-text';
            case 'meeting': return 'videocam';
            case 'task': return 'checkbox';
            default: return 'calendar';
        }
    };

    if (compact) {
        return (
            <TouchableOpacity
                style={[styles.eventCardCompact, { borderLeftColor: event.color || EVENT_COLORS[event.type] }]}
                onPress={onPress}
            >
                <Text style={styles.eventCardCompactTime}>
                    {event.allDay ? 'All day' : formatTime(startDate)}
                </Text>
                <Text style={styles.eventCardCompactTitle} numberOfLines={1}>
                    {event.title}
                </Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.eventCard, { borderLeftColor: event.color || EVENT_COLORS[event.type] }]}
            onPress={onPress}
        >
            <View style={styles.eventCardHeader}>
                <View style={styles.eventCardIcon}>
                    <Ionicons
                        name={getTypeIcon(event.type)}
                        size={16}
                        color={event.color || EVENT_COLORS[event.type]}
                    />
                </View>
                <View style={styles.eventCardContent}>
                    <Text style={styles.eventCardTitle}>{event.title}</Text>
                    <Text style={styles.eventCardTime}>
                        {event.allDay ? 'All day' : formatTime(startDate)}
                        {event.location && ` · ${event.location}`}
                    </Text>
                </View>
                <TouchableOpacity onPress={onDelete} style={styles.eventDeleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
            </View>
            {event.description && (
                <Text style={styles.eventCardDescription} numberOfLines={2}>
                    {event.description}
                </Text>
            )}
            {event.completed && (
                <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                    <Text style={styles.completedText}>Completed</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

interface CreateEventModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (event: Partial<CalendarEvent>) => void;
    selectedDate: Date;
    editingEvent?: CalendarEvent | null;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
    visible,
    onClose,
    onSave,
    selectedDate,
    editingEvent
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [type, setType] = useState<CalendarEventType>('personal');
    const [allDay, setAllDay] = useState(false);
    const [recurrence, setRecurrence] = useState<RecurrencePattern>('none');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editingEvent) {
            setTitle(editingEvent.title);
            setDescription(editingEvent.description || '');
            setLocation(editingEvent.location || '');
            setType(editingEvent.type);
            setAllDay(editingEvent.allDay || false);
            setRecurrence(editingEvent.recurrence);
        } else {
            setTitle('');
            setDescription('');
            setLocation('');
            setType('personal');
            setAllDay(false);
            setRecurrence('none');
        }
    }, [editingEvent, visible]);

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter an event title');
            return;
        }

        setSaving(true);
        try {
            const eventData: Partial<CalendarEvent> = {
                title: title.trim(),
                description: description.trim() || undefined,
                location: location.trim() || undefined,
                type,
                allDay,
                recurrence,
                startDate: Timestamp.fromDate(selectedDate),
                endDate: Timestamp.fromDate(selectedDate),
                reminders: [60]
            };

            await onSave(eventData);
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to save event');
        } finally {
            setSaving(false);
        }
    };

    const eventTypes: { key: CalendarEventType; label: string; icon: string }[] = [
        { key: 'personal', label: 'Personal', icon: 'calendar' },
        { key: 'meeting', label: 'Meeting', icon: 'videocam' },
        { key: 'task', label: 'Task', icon: 'checkbox' }
    ];

    const recurrenceOptions: { key: RecurrencePattern; label: string }[] = [
        { key: 'none', label: 'Does not repeat' },
        { key: 'daily', label: 'Daily' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'biweekly', label: 'Every 2 weeks' },
        { key: 'monthly', label: 'Monthly' }
    ];

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingEvent ? 'Edit Event' : 'New Event'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <Text style={styles.inputLabel}>Title *</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Event title"
                            placeholderTextColor={COLORS.muted}
                        />

                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Add description"
                            placeholderTextColor={COLORS.muted}
                            multiline
                            numberOfLines={3}
                        />

                        <Text style={styles.inputLabel}>Location</Text>
                        <TextInput
                            style={styles.input}
                            value={location}
                            onChangeText={setLocation}
                            placeholder="Add location"
                            placeholderTextColor={COLORS.muted}
                        />

                        <Text style={styles.inputLabel}>Event Type</Text>
                        <View style={styles.typeSelector}>
                            {eventTypes.map(({ key, label, icon }) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.typeOption,
                                        type === key && { backgroundColor: EVENT_COLORS[key] + '20', borderColor: EVENT_COLORS[key] }
                                    ]}
                                    onPress={() => setType(key)}
                                >
                                    <Ionicons
                                        name={icon as any}
                                        size={18}
                                        color={type === key ? EVENT_COLORS[key] : COLORS.muted}
                                    />
                                    <Text
                                        style={[
                                            styles.typeLabel,
                                            type === key && { color: EVENT_COLORS[key] }
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.toggleRow}>
                            <Text style={styles.inputLabel}>All Day</Text>
                            <TouchableOpacity
                                style={[styles.toggle, allDay && styles.toggleActive]}
                                onPress={() => setAllDay(!allDay)}
                            >
                                {allDay && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Repeat</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.recurrenceSelector}>
                                {recurrenceOptions.map(({ key, label }) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.recurrenceOption,
                                            recurrence === key && styles.recurrenceOptionActive
                                        ]}
                                        onPress={() => setRecurrence(key)}
                                    >
                                        <Text
                                            style={[
                                                styles.recurrenceLabel,
                                                recurrence === key && styles.recurrenceLabelActive
                                            ]}
                                        >
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    {editingEvent ? 'Update Event' : 'Create Event'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const CalendarScreen: React.FC = () => {
    const navigation = useNavigation();
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [stats, setStats] = useState({ todayCount: 0, weekCount: 0, pendingMilestones: 0, overdueCount: 0 });

    // Get calendar grid dates for month view
    const getMonthDates = useCallback((date: Date): Date[] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const dates: Date[] = [];

        // Add days from previous month to fill the first week
        const firstDayOfWeek = firstDay.getDay();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const prevDate = new Date(year, month, -i);
            dates.push(prevDate);
        }

        // Add days of current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            dates.push(new Date(year, month, i));
        }

        // Add days from next month to complete the grid (6 rows)
        const remaining = 42 - dates.length;
        for (let i = 1; i <= remaining; i++) {
            dates.push(new Date(year, month + 1, i));
        }

        return dates;
    }, []);

    // Load events for current view
    const loadEvents = useCallback(async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthEvents = await personalCalendarService.getEventsForMonth(year, month);
            
            // Expand recurring events
            const startRange = new Date(year, month, 1);
            const endRange = new Date(year, month + 1, 0);
            const expanded = personalCalendarService.expandRecurringEvents(monthEvents, startRange, endRange);
            
            setEvents(expanded);

            // Load stats
            const calStats = await personalCalendarService.getCalendarStats();
            setStats(calStats);
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoading(false);
        }
    }, [currentDate]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    // Get events for a specific date
    const getEventsForDate = (date: Date): CalendarEvent[] => {
        return events.filter(event => {
            const eventDate = event.startDate instanceof Timestamp
                ? event.startDate.toDate()
                : new Date();
            return (
                eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear()
            );
        });
    };

    // Navigation
    const goToPrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    // Event handlers
    const handleCreateEvent = async (eventData: Partial<CalendarEvent>) => {
        if (editingEvent) {
            await personalCalendarService.updateEvent(editingEvent.id, eventData);
        } else {
            await personalCalendarService.createEvent(eventData as any);
        }
        setEditingEvent(null);
        loadEvents();
    };

    const handleDeleteEvent = async (eventId: string) => {
        Alert.alert(
            'Delete Event',
            'Are you sure you want to delete this event?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        // Handle recurring event instance ID
                        const baseId = eventId.includes('_') ? eventId.split('_')[0] : eventId;
                        await personalCalendarService.deleteEvent(baseId);
                        loadEvents();
                    }
                }
            ]
        );
    };

    const handleEditEvent = (event: CalendarEvent) => {
        // For recurring instances, get the base event
        const baseId = event.id.includes('_') ? event.id.split('_')[0] : event.id;
        const baseEvent = events.find(e => e.id === baseId) || event;
        setEditingEvent(baseEvent);
        setShowCreateModal(true);
    };

    const selectedDateEvents = getEventsForDate(selectedDate);
    const monthDates = getMonthDates(currentDate);
    const today = new Date();

    const isToday = (date: Date) =>
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

    const isSelected = (date: Date) =>
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();

    const isCurrentMonth = (date: Date) =>
        date.getMonth() === currentDate.getMonth();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={{ marginRight: 12 }}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Calendar</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            setEditingEvent(null);
                            setShowCreateModal(true);
                        }}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.todayCount}</Text>
                        <Text style={styles.statLabel}>Today</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.weekCount}</Text>
                        <Text style={styles.statLabel}>This Week</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.pendingMilestones}</Text>
                        <Text style={styles.statLabel}>Milestones</Text>
                    </View>
                    {stats.overdueCount > 0 && (
                        <View style={[styles.statItem, styles.statItemDanger]}>
                            <Text style={[styles.statValue, styles.statValueDanger]}>{stats.overdueCount}</Text>
                            <Text style={styles.statLabel}>Overdue</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={goToToday}>
                    <Text style={styles.monthTitle}>
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                    <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* View Mode Tabs */}
            <View style={styles.viewTabs}>
                {(['month', 'week', 'agenda'] as ViewMode[]).map(mode => (
                    <TouchableOpacity
                        key={mode}
                        style={[styles.viewTab, viewMode === mode && styles.viewTabActive]}
                        onPress={() => setViewMode(mode)}
                    >
                        <Text style={[styles.viewTabText, viewMode === mode && styles.viewTabTextActive]}>
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <>
                    {viewMode === 'month' && (
                        <>
                            {/* Day Headers */}
                            <View style={styles.dayHeaders}>
                                {DAYS.map(day => (
                                    <Text key={day} style={styles.dayHeader}>{day}</Text>
                                ))}
                            </View>

                            {/* Calendar Grid */}
                            <View style={styles.calendarGrid}>
                                {monthDates.map((date, idx) => (
                                    <CalendarDay
                                        key={idx}
                                        date={date}
                                        isCurrentMonth={isCurrentMonth(date)}
                                        isToday={isToday(date)}
                                        isSelected={isSelected(date)}
                                        events={getEventsForDate(date)}
                                        onPress={() => setSelectedDate(date)}
                                    />
                                ))}
                            </View>

                            {/* Selected Day Events */}
                            <View style={styles.selectedDayEvents}>
                                <Text style={styles.selectedDayTitle}>
                                    {selectedDate.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </Text>
                                {selectedDateEvents.length === 0 ? (
                                    <Text style={styles.noEventsText}>No events</Text>
                                ) : (
                                    <ScrollView style={styles.eventsList}>
                                        {selectedDateEvents.map(event => (
                                            <EventCard
                                                key={event.id}
                                                event={event}
                                                onPress={() => handleEditEvent(event)}
                                                onDelete={() => handleDeleteEvent(event.id)}
                                                compact
                                            />
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        </>
                    )}

                    {viewMode === 'agenda' && (
                        <FlatList
                            data={events.sort((a, b) => {
                                const aTime = a.startDate instanceof Timestamp ? a.startDate.toMillis() : 0;
                                const bTime = b.startDate instanceof Timestamp ? b.startDate.toMillis() : 0;
                                return aTime - bTime;
                            })}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <EventCard
                                    event={item}
                                    onPress={() => handleEditEvent(item)}
                                    onDelete={() => handleDeleteEvent(item.id)}
                                />
                            )}
                            contentContainerStyle={styles.agendaList}
                            ListEmptyComponent={
                                <Text style={styles.noEventsText}>No events this month</Text>
                            }
                        />
                    )}

                    {viewMode === 'week' && (
                        <View style={styles.weekView}>
                            <Text style={styles.comingSoonText}>Week view coming soon</Text>
                        </View>
                    )}
                </>
            )}

            {/* Create/Edit Event Modal */}
            <CreateEventModal
                visible={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingEvent(null);
                }}
                onSave={handleCreateEvent}
                selectedDate={selectedDate}
                editingEvent={editingEvent}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    header: {
        padding: 16,
        backgroundColor: COLORS.primary
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff'
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12
    },
    statItem: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center'
    },
    statItemDanger: {
        backgroundColor: 'rgba(220,38,38,0.3)'
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff'
    },
    statValueDanger: {
        color: '#FCA5A5'
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)'
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.surface
    },
    navButton: {
        padding: 8
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text
    },
    viewTabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 8,
        backgroundColor: COLORS.surface,
        gap: 8
    },
    viewTab: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: COLORS.background
    },
    viewTabActive: {
        backgroundColor: COLORS.primary
    },
    viewTabText: {
        fontSize: 13,
        color: COLORS.muted
    },
    viewTabTextActive: {
        color: '#fff',
        fontWeight: '600'
    },
    dayHeaders: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 8
    },
    dayHeader: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.muted
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4
    },
    dayOtherMonth: {
        opacity: 0.4
    },
    dayToday: {
        backgroundColor: COLORS.primary + '20',
        borderRadius: 8
    },
    daySelected: {
        backgroundColor: COLORS.primary,
        borderRadius: 8
    },
    dayNumber: {
        fontSize: 14,
        color: COLORS.text
    },
    dayNumberOther: {
        color: COLORS.muted
    },
    dayNumberToday: {
        fontWeight: 'bold',
        color: COLORS.primary
    },
    dayNumberSelected: {
        fontWeight: 'bold',
        color: '#fff'
    },
    eventDots: {
        flexDirection: 'row',
        marginTop: 2,
        gap: 2
    },
    eventDot: {
        width: 4,
        height: 4,
        borderRadius: 2
    },
    selectedDayEvents: {
        flex: 1,
        padding: 16,
        backgroundColor: COLORS.surface,
        marginTop: 8,
        marginHorizontal: 8,
        borderRadius: 12
    },
    selectedDayTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12
    },
    noEventsText: {
        fontSize: 14,
        color: COLORS.muted,
        textAlign: 'center',
        paddingVertical: 20
    },
    eventsList: {
        flex: 1
    },
    eventCard: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 3
    },
    eventCardCompact: {
        backgroundColor: COLORS.background,
        borderRadius: 6,
        padding: 8,
        marginBottom: 6,
        borderLeftWidth: 3,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    eventCardCompactTime: {
        fontSize: 12,
        color: COLORS.muted,
        width: 60
    },
    eventCardCompactTitle: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text
    },
    eventCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    eventCardIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    eventCardContent: {
        flex: 1
    },
    eventCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text
    },
    eventCardTime: {
        fontSize: 13,
        color: COLORS.muted,
        marginTop: 2
    },
    eventCardDescription: {
        fontSize: 13,
        color: COLORS.muted,
        marginTop: 8
    },
    eventDeleteBtn: {
        padding: 4
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4
    },
    completedText: {
        fontSize: 12,
        color: COLORS.success
    },
    agendaList: {
        padding: 16
    },
    weekView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    comingSoonText: {
        fontSize: 16,
        color: COLORS.muted
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text
    },
    modalBody: {
        padding: 16
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        marginBottom: 8,
        marginTop: 16
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    inputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top'
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8
    },
    typeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6
    },
    typeLabel: {
        fontSize: 13,
        color: COLORS.muted
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16
    },
    toggle: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center'
    },
    toggleActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    recurrenceSelector: {
        flexDirection: 'row',
        gap: 8
    },
    recurrenceOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    recurrenceOptionActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    recurrenceLabel: {
        fontSize: 13,
        color: COLORS.muted
    },
    recurrenceLabelActive: {
        color: '#fff'
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        padding: 14,
        alignItems: 'center'
    },
    saveButtonDisabled: {
        opacity: 0.7
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff'
    }
});

export default CalendarScreen;
