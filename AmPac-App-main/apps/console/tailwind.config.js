/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#FFFFFF',
                surface: '#FFFFFF',
                surfaceHighlight: '#F4F4F5', // Zinc 100
                text: '#09090B', // Zinc 950
                textSecondary: '#71717A', // Zinc 500
                primary: '#09090B', // Zinc 950
                primaryLight: '#27272A', // Zinc 800
                secondary: '#52525B', // Zinc 600
                accent: '#00C853', // Sharp Green
                border: '#E4E4E7', // Zinc 200
                error: '#EF4444',
                success: '#10B981',
                warning: '#F59E0B',
                info: '#3B82F6',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                sm: '2px',
                md: '4px',
                lg: '8px',
                xl: '12px',
            },
            boxShadow: {
                float: '0 4px 12px rgba(0, 0, 0, 0.1)',
                subtle: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }
        },
    },
    plugins: [],
}
