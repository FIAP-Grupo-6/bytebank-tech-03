import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance';
import { formatBRL } from '@/lib/format';
import { colors, radius, spacing, type } from '@/theme';

/**
 * Entradas e saídas lado a lado, com entrada em cascata.
 * A cascata dá ordem de leitura: primeiro o que entrou, depois o que saiu.
 */
export function SummaryCards({
  totalCredit,
  totalDebit,
}: {
  totalCredit: number;
  totalDebit: number;
}) {
  const { styleFor } = useStaggeredEntrance(2);

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.card, styleFor(0)]}>
        <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="arrow-down" size={15} color={colors.primary} />
        </View>
        <Text style={styles.label}>Entradas</Text>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {formatBRL(totalCredit)}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.card, styleFor(1)]}>
        <View style={[styles.iconBox, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="arrow-up" size={15} color={colors.danger} />
        </View>
        <Text style={styles.label}>Saídas</Text>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {formatBRL(totalDebit)}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: { ...type.label, color: colors.textFaint },
  value: { ...type.h2, color: colors.text },
});
