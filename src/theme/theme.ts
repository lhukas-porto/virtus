import { DefaultTheme } from '@react-navigation/native';

export const theme = {
    colors: {
        primary: '#3E8E41',
        accent: '#E67E22',
        background: '#FFFFFF',
        text: '#2C3E50',
        alert: '#D35400',
        success: '#27AE60',
        surface: '#FFFFFF',
        border: '#E0E0E0',
        notification: '#E67E22',
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
