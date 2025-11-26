export const theme = {
    colors: {
        primary: '#005596', // AmPac Blue
        secondary: '#7AB800', // AmPac Green
        background: '#F5F7FA', // Light Grey/Blue background
        surface: '#FFFFFF',
        text: '#1A1A1A',
        textSecondary: '#666666',
        border: '#E0E0E0',
        error: '#D32F2F',
        success: '#388E3C',
        warning: '#FBC02D',
        info: '#0288D1',
        // Glassmorphism
        glass: 'rgba(255, 255, 255, 0.8)',
        glassBorder: 'rgba(255, 255, 255, 0.5)',
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
            fontSize: 32,
            fontWeight: 'bold' as 'bold',
            color: '#1A1A1A',
        },
        h2: {
            fontSize: 24,
            fontWeight: 'bold' as 'bold',
            color: '#1A1A1A',
        },
        h3: {
            fontSize: 20,
            fontWeight: '600' as '600',
            color: '#1A1A1A',
        },
        body: {
            fontSize: 16,
            color: '#1A1A1A',
            lineHeight: 24,
        },
        caption: {
            fontSize: 12,
            color: '#666666',
        },
        button: {
            fontSize: 16,
            fontWeight: '600' as '600',
            color: '#FFFFFF',
        },
    },
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 16,
        xl: 24,
        round: 9999,
    },
    shadows: {
        card: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
        },
        float: {
            shadowColor: '#005596',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 6,
        },
    },
};
