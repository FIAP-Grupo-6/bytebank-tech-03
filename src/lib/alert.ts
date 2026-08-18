import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert` do React Native é um no-op no `react-native-web` (não tem UI
 * nativa de alerta no browser), então o diálogo simplesmente não aparece,
 * mesmo com botões e `onPress`. Estas funções caem para `window.confirm` /
 * `window.alert` na Web e usam `Alert.alert` normalmente nas demais plataformas.
 */

/** Aviso de uma via (equivalente a `Alert.alert(title, message)`). */
export function notify(title: string, message?: string, onDismiss?: () => void): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onDismiss?.();
    return;
  }

  if (onDismiss) {
    Alert.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
  } else {
    Alert.alert(title, message);
  }
}

/** Confirmação de duas opções (confirmar/cancelar). */
export function confirm(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  options?: { cancelLabel?: string; destructive?: boolean; onCancel?: () => void }
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    else options?.onCancel?.();
    return;
  }

  Alert.alert(title, message, [
    { text: options?.cancelLabel ?? 'Cancelar', style: 'cancel', onPress: options?.onCancel },
    {
      text: confirmLabel,
      style: options?.destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
