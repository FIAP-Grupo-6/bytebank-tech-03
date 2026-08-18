import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, type } from '@/theme';

/** Pílula selecionável. Com `onRemove`, vira chip de filtro ativo. */
export function Chip({
  label,
  selected = false,
  onPress,
  onRemove,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable
      onPress={onRemove ?? onPress}
      accessibilityRole="button"
      accessibilityLabel={onRemove ? `Remover filtro ${label}` : label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <Ionicons
          name="close"
          size={14}
          color={selected ? colors.backgroundDeep : colors.textMuted}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.75 },
  label: { ...type.smallMedium, color: colors.textMuted },
  labelSelected: { color: colors.backgroundDeep },
});
