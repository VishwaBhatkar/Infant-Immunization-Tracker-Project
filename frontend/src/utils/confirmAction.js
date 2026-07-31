import { Alert, Platform } from 'react-native';
/**
 * Displays a confirmation dialog that works on Web, Android and iOS.
 * React Native Web does not reliably execute Alert button callbacks, so
 * the browser's native confirm dialog is used on Web.
 */
export const confirmAction = (title, message, confirmText = 'Confirm', cancelText = 'Cancel') => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }
    return new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
            { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
        ], { cancelable: true, onDismiss: () => resolve(false) });
    });
};
