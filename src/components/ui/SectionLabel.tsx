import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/theme';

/**
 * Rótulo de seção. A linha à direita não é decoração: ela mede o espaço que
 * sobra e por isso deixa claro onde a seção termina.
 */
export function SectionLabel({ children }: { children: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.text}>{children}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  text: { ...type.label, color: colors.textFaint },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
});
