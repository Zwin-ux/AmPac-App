import { Timestamp } from 'firebase/firestore';
import {
    PricingQuoteRequest,
    PricingQuoteResponse,
    Room,
    PricingRule,
    PriceBreakdown
} from '../types';

const TAX_RATE = 0.0775;
const DEFAULT_FEE = 0;

const toMillis = (ts: Timestamp) => ts.toMillis();
const hoursBetween = (start: Timestamp, end: Timestamp) => {
    const diffMs = toMillis(end) - toMillis(start);
    return Math.max(0, diffMs / (1000 * 60 * 60));
};

const defaultPricingRules = (room: Room): PricingRule[] => {
    if (room.pricingRules && room.pricingRules.length) {
        return room.pricingRules;
    }

    return [
        {
            id: `${room.id}-tiered`,
            type: 'hourly_tier',
            priority: 10,
            tiers: [
                { upToHours: 3, rate: room.pricePerHour, label: 'Standard' },
                { minHours: 3, rate: Math.round(room.pricePerHour * 0.85), label: 'Half-day saver' },
                { minHours: 8, rate: Math.round(room.pricePerHour * 0.75), label: 'Day rate' },
            ],
        },
        {
            id: `${room.id}-peak`,
            type: 'peak',
            priority: 8,
            peakStartHour: 8,
            peakEndHour: 18,
            multiplier: 1.1,
        },
        {
            id: `${room.id}-weekend`,
            type: 'weekend',
            priority: 7,
            multiplier: 1.05,
        },
    ];
};

const isWeekend = (start: Timestamp) => {
    const day = start.toDate().getDay();
    return day === 0 || day === 6;
};

const isPeak = (rule: PricingRule, ts: Timestamp) => {
    if (rule.peakStartHour === undefined || rule.peakEndHour === undefined) return false;
    const hour = ts.toDate().getHours();
    return hour >= rule.peakStartHour && hour < rule.peakEndHour;
};

const pickTierRate = (tiers: PricingRule['tiers'], durationHours: number, fallbackRate: number) => {
    if (!tiers || tiers.length === 0) return fallbackRate;
    const matched = tiers.find(tier => {
        const withinUpper = tier.upToHours === undefined || durationHours <= tier.upToHours;
        const meetsLower = tier.minHours === undefined || durationHours >= tier.minHours;
        return withinUpper && meetsLower;
    });
    return matched?.rate ?? tiers[tiers.length - 1].rate ?? fallbackRate;
};

const applyPricingRules = (
    room: Room,
    start: Timestamp,
    end: Timestamp,
    customerTier?: 'member' | 'non_member',
    attendees: number = 1
) => {
    const rules = defaultPricingRules(room).slice().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const durationHours = hoursBetween(start, end);
    let hourlyRate = room.pricePerHour;
    let baseCost = hourlyRate * durationHours;
    const appliedRules: string[] = [];

    for (const rule of rules) {
        switch (rule.type) {
            case 'hourly_tier': {
                const rate = pickTierRate(rule.tiers, durationHours, hourlyRate);
                hourlyRate = rate;
                baseCost = rate * durationHours;
                if (rule.id) appliedRules.push(rule.id);
                break;
            }
            case 'bundle': {
                if (rule.bundleHours && rule.flatAmount) {
                    const bundles = Math.ceil(durationHours / rule.bundleHours);
                    const bundleCost = bundles * rule.flatAmount;
                    baseCost = Math.min(baseCost, bundleCost);
                    if (rule.id) appliedRules.push(rule.id);
                }
                break;
            }
            case 'peak': {
                if (isPeak(rule, start) && rule.multiplier) {
                    baseCost *= rule.multiplier;
                    if (rule.id) appliedRules.push(rule.id);
                }
                break;
            }
            case 'weekend': {
                if (isWeekend(start) && rule.multiplier) {
                    baseCost *= rule.multiplier;
                    if (rule.id) appliedRules.push(rule.id);
                }
                break;
            }
            case 'holiday': {
                // Placeholder: real holiday calendar TBD
                break;
            }
            case 'member': {
                if (rule.customerTier && rule.customerTier === customerTier && rule.multiplier) {
                    baseCost *= rule.multiplier;
                    if (rule.id) appliedRules.push(rule.id);
                }
                break;
            }
            default:
                break;
        }
    }

    // Simple per-attendee adjustment: charge $5 per attendee per hour beyond the first
    const attendeeSurcharge = Math.max(0, attendees - 1) * 5 * durationHours;
    if (attendeeSurcharge > 0) {
        baseCost += attendeeSurcharge;
        appliedRules.push('attendee_surcharge');
    }

    return { baseCost, appliedRules };
};

const buildBreakdown = (baseCost: number, appliedRules: string[]): PriceBreakdown => {
    const addOns = 0; // Add-ons are handled upstream once catalog data exists
    const fees = DEFAULT_FEE;
    const taxableAmount = baseCost + addOns + fees;
    const taxes = Number((taxableAmount * TAX_RATE).toFixed(2));
    const discounts = 0;
    const total = Number((baseCost + addOns + fees + taxes - discounts).toFixed(2));

    return {
        base: Number(baseCost.toFixed(2)),
        addOns,
        fees,
        taxes,
        discounts,
        total,
        appliedRules,
        currency: 'USD',
    };
};

export const pricingService = {
    calculateRoomPrice: ({
        room,
        startTime,
        endTime,
        customerTier,
        attendees = 1,
    }: {
        room: Room;
        startTime: Timestamp;
        endTime: Timestamp;
        customerTier?: 'member' | 'non_member';
        attendees?: number;
    }) => {
        const { baseCost, appliedRules } = applyPricingRules(room, startTime, endTime, customerTier, attendees);
        const priceBreakdown = buildBreakdown(baseCost, appliedRules);
        return { priceBreakdown, appliedRules };
    },

    quote: (request: PricingQuoteRequest, rooms: Room[]): PricingQuoteResponse => {
        const roomMap = rooms.reduce<Record<string, Room>>((acc, room) => {
            acc[room.id] = room;
            return acc;
        }, {});

        const items = request.rooms.map(({ roomId, startTime, endTime, attendees }) => {
            const room = roomMap[roomId];
            if (!room) {
                const empty: PriceBreakdown = { base: 0, addOns: 0, fees: 0, taxes: 0, discounts: 0, total: 0, currency: 'USD' };
                return { roomId, priceBreakdown: empty, appliedRules: [] };
            }
            const { priceBreakdown, appliedRules } = pricingService.calculateRoomPrice({
                room,
                startTime,
                endTime,
                customerTier: request.customerTier,
                attendees: attendees ?? 1,
            });
            return { roomId, priceBreakdown, appliedRules };
        });

        const total = Number(items.reduce((sum, item) => sum + (item.priceBreakdown?.total ?? 0), 0).toFixed(2));
        return { items, total, currency: 'USD' };
    },
};
