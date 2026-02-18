/**
 * Paleta de Cores do Vitus
 * Baseado na especificação de Design System (Shiva)
 */

const tintColorLight = '#06815B'; // Deep Emerald (from reference)
const tintColorDark = '#34D399'; // Emerald 400

export const Colors = {
    light: {
        text: '#1F2937', // Gray 800
        background: '#F0F4F2', // Soft Mint Background
        tint: tintColorLight,
        icon: '#6B7280', // Gray 500
        tabIconDefault: '#9CA3AF', // Gray 400
        tabIconSelected: tintColorLight,
        primary: '#06815B', // Verde Esmeralda Profundo
        secondary: '#07A070', // Verde Esmeralda Vibrante
        alert: '#C2563D', // Terracota Original
        warning: '#F59E0B', // Amber 500
        success: '#06815B', // Emerald matches primary
        card: '#FFFFFF',
        border: '#E5E7EB', // Gray 200
    },
    dark: {
        text: '#F9FAFB', // Gray 50
        background: '#111827', // Gray 900
        tint: tintColorDark,
        icon: '#9CA3AF', // Gray 400
        tabIconDefault: '#9CA3AF',
        tabIconSelected: tintColorDark,
        primary: '#34D399', // Emerald 400
        secondary: '#10B981',
        alert: '#FB923C', // Terracota Light (Orange 400)
        warning: '#FBBF24', // Amber 400
        success: '#34D399',
        card: '#1F2937', // Gray 800
        border: '#374151', // Gray 700
    },
};