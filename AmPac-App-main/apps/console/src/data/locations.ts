export const LOCATIONS = [
    { id: 'global', name: 'Global (All Sites)' },
    { id: 'ontario', name: 'Ontario (HQ)' },
    { id: 'san_bernardino', name: 'San Bernardino' },
    { id: 'riverside', name: 'Riverside' },
    { id: 'high_desert', name: 'High Desert' },
] as const;

export type LocationId = typeof LOCATIONS[number]['id'];
