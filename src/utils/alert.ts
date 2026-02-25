import { Alert, Platform } from 'react-native';

type Button = {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
};

/**
 * Cross-platform alert. Uses window.alert/confirm on web, Alert.alert on native.
 * If buttons include a destructive/confirm action, uses window.confirm on web.
 */
export const showAlert = (title: string, message?: string, buttons?: Button[]) => {
    if (Platform.OS === 'web') {
        // Find if there's a destructive or non-cancel action (i.e. confirmation needed)
        const confirmBtn = buttons?.find(b => b.style === 'destructive' || (b.style !== 'cancel' && b.onPress));

        if (confirmBtn && buttons && buttons.length > 1) {
            // Use confirm dialog for multi-button scenarios
            const msg = [title, message].filter(Boolean).join('\n\n');
            if (window.confirm(msg)) {
                confirmBtn.onPress?.();
            }
        } else {
            // Simple info alert
            const msg = [title, message].filter(Boolean).join('\n\n');
            window.alert(msg);
            // Call the single button's onPress if it exists
            const singleBtn = buttons?.find(b => b.onPress);
            singleBtn?.onPress?.();
        }
        return;
    }

    // Native: use React Native's Alert
    Alert.alert(
        title,
        message,
        buttons?.map(b => ({
            text: b.text,
            style: b.style,
            onPress: b.onPress,
        })) ?? [{ text: 'OK' }]
    );
};
