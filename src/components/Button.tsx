import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    type?: 'primary' | 'secondary' | 'danger';
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    type = 'primary',
    style,
    textStyle
}) => {
    return (
        <TouchableOpacity
            style={[styles.button, styles[type], style]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={[
                styles.text,
                type === 'secondary' && { color: theme.colors.primary },
                type === 'danger' && { color: theme.colors.alert },
                textStyle
            ]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primary: {
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    secondary: {
        backgroundColor: '#F0F4F0', // Very light green tint
        borderWidth: 0,
    },
    danger: {
        backgroundColor: '#FFF1F0', // Very light red tint
    },
    text: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: theme.fonts.bold,
    },
});
