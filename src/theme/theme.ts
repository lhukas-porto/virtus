import { DefaultTheme } from '@react-navigation/native';

export const theme = {
    colors: {
        primary: '#06815B', // Novo Verde Esmeralda (Vibrante)
        accent: '#C2563D',  // Nova Terracota (Quente)
        background: '#F0F4F2', // Soft Mint Background
        text: '#1F2937',    // Deep Slate
        alert: '#C2563D',   // Alertas em Terracota
        success: '#06815B',
        surface: '#FFFFFF',
        border: '#D1DBE3',
        notification: '#C2563D',
    },
    spacing: {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
        xl: 48,
        xxl: 64,
    },
    roundness: 16,
    fonts: {
        heading: 'PlayfairDisplay_700Bold',
        body: 'Outfit_400Regular',
        semiBold: 'Outfit_600SemiBold',
        bold: 'Outfit_700Bold',
    },
};

export const NavTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.notification,
    },
};
