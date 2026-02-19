import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
    title: string;
    onPress: () => void;
    type?: 'primary' | 'secondary' | 'danger';
    style?: ViewStyle;
    textStyle?: TextStyle;
    loading?: boolean;
    disabled?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    type = 'primary',
    style,
    textStyle,
    loading = false,
    disabled = false,
    icon
}) => {
    const isPrimary = type === 'primary';
    const textColor = isPrimary ? '#FFF' : (type === 'danger' ? theme.colors.alert : theme.colors.primary);

    return (
        <TouchableOpacity
            style={[
                styles.button,
                styles[type],
                (disabled || loading) && styles.disabled,
                style
            ]}
            onPress={onPress}
            activeOpacity={0.8}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {icon && <Ionicons name={icon} size={20} color={textColor} style={{ marginRight: 8 }} />}
                    <Text style={[
                        styles.text,
                        { color: textColor },
                        textStyle
                    ]}>
                        {title}
                    </Text>
                </View>
            )}
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
    disabled: {
        opacity: 0.6,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: theme.fonts.bold,
    },
});
