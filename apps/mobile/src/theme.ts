export const theme = {
    colors: {
        background: '#FFFFFF', // Pure White
        surface: '#FFFFFF',
        surfaceHighlight: '#F4F4F5', // Zinc 100
        text: '#09090B', // Zinc 950 (Almost Black)
        textSecondary: '#71717A', // Zinc 500
        primary: '#09090B', // Zinc 950
        primaryLight: '#27272A', // Zinc 800
        secondary: '#52525B', // Zinc 600
        accent: '#00C853', // Sharp Green (Success/Action)
        border: '#E4E4E7', // Zinc 200
        error: '#EF4444', // Red 500
        success: '#10B981', // Emerald 500
        warning: '#F59E0B', // Amber 500
        info: '#3B82F6', // Blue 500
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    typography: {
        h1: {
            fontSize: 24,
            fontWeight: '700',
            color: '#09090B',
            letterSpacing: -0.5,
            lineHeight: 32,
        },
        h2: {
            fontSize: 20,
            fontWeight: '600',
            color: '#09090B',
            letterSpacing: -0.3,
            lineHeight: 28,
        },
        h3: {
            fontSize: 18,
            fontWeight: '600',
            color: '#09090B',
            letterSpacing: -0.2,
            lineHeight: 24,
        },
        body: {
            fontSize: 15, // Slightly smaller, denser
            color: '#09090B',
            lineHeight: 22,
        },
        label: {
            fontSize: 13,
            fontWeight: '500',
            color: '#71717A',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        caption: {
            fontSize: 12,
            color: '#71717A',
            lineHeight: 16,
        },
        button: {
            fontSize: 14,
            fontWeight: '600',
            color: '#FFFFFF',
            letterSpacing: 0.2,
        },
        display: {
            fontSize: 32,
            fontWeight: '800',
            color: '#09090B',
            letterSpacing: -1,
        }
    },
    borderRadius: {
        sm: 2,
        md: 4, // Sharp, engineered look
        lg: 8,
        xl: 12,
        round: 9999,
    },
    shadows: {
        card: {
            // No shadow, just border for the "flat" look
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
            borderWidth: 1,
            borderColor: '#E4E4E7',
        },
        float: {
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
        },
        subtle: {
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 1,
            },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        }
    }
} as const;
