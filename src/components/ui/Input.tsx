import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, type } from '@/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  /** Texto de apoio abaixo do campo, some quando há erro. */
  hint?: string;
  /** Ação no canto direito, ex.: mostrar/ocultar senha. */
  trailing?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  hint,
  trailing,
  containerStyle,
  ...inputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        <TextInput
          {...inputProps}
          style={styles.input}
          placeholderTextColor={colors.textFaint}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          accessibilityLabel={label}
          // Liga o erro ao campo para o leitor de tela anunciar os dois juntos.
          accessibilityHint={error ?? hint}
        />
        {trailing}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/**
 * Campo que abre um seletor em vez de aceitar digitação.
 * Mesma moldura do Input para os formulários não parecerem remendados.
 */
export function PickerField({
  label,
  value,
  placeholder,
  error,
  hint,
  onPress,
  disabled,
  trailing,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  error?: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [
          styles.field,
          styles.pickerField,
          pressed && styles.fieldFocused,
          !!error && styles.fieldError,
          disabled && styles.fieldDisabled,
        ]}
      >
        <Text
          style={[styles.pickerText, !value && styles.pickerPlaceholder]}
          numberOfLines={1}
        >
          {value ?? placeholder}
        </Text>
        {trailing}
      </Pressable>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...type.smallMedium, color: colors.textMuted },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  fieldFocused: { borderColor: colors.primary },
  fieldError: { borderColor: colors.danger },
  fieldDisabled: { opacity: 0.5 },
  pickerField: { justifyContent: 'space-between' },
  input: {
    flex: 1,
    ...type.body,
    color: colors.text,
    // Sem isto o Android corta descendentes (g, p) em fontes customizadas.
    paddingVertical: spacing.md,
  },
  pickerText: { ...type.body, color: colors.text, flex: 1 },
  pickerPlaceholder: { color: colors.textFaint },
  error: { ...type.small, color: colors.danger },
  hint: { ...type.small, color: colors.textFaint },
});
