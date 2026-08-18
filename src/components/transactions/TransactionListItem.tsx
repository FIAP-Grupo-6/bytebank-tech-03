import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatRelativeDay as relativeDay } from '@/lib/date';
import { formatBRL } from '@/lib/format';
import { colors, radius, spacing, type } from '@/theme';
import type { Transaction } from '@/types';

interface TransactionListItemProps {
  transaction: Transaction;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * Linha da listagem.
 *
 * `memo` importa aqui: a lista é virtualizada e recebe páginas novas a cada
 * scroll, então sem memo cada item re-renderiza a cada `loadMore`.
 */
export const TransactionListItem = memo(function TransactionListItem({
  transaction,
  onPress,
  onLongPress,
}: TransactionListItemProps) {
  const isCredit = transaction.type === 'Credit';
  const accent = isCredit ? colors.primary : colors.danger;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityLabel={
        `${isCredit ? 'Entrada' : 'Saída'} de ${formatBRL(transaction.value)}, ` +
        `${transaction.category}, ${relativeDay(transaction.date)}`
      }
      accessibilityHint="Toque para editar. Toque longo para mais ações."
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: isCredit ? colors.primarySoft : colors.dangerSoft },
        ]}
      >
        <Ionicons
          name={isCredit ? 'arrow-down' : 'arrow-up'}
          size={16}
          color={accent}
        />
      </View>

      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {transaction.description?.trim() || transaction.category}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {transaction.subcategory ?? transaction.category}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{relativeDay(transaction.date)}</Text>
          {transaction.receiptUrl ? (
            <Ionicons
              name="attach"
              size={13}
              color={colors.textFaint}
              style={styles.attachIcon}
            />
          ) : null}
        </View>
      </View>

      <Text style={[styles.amount, { color: accent }]} numberOfLines={1}>
        {isCredit ? '+' : '−'} {formatBRL(transaction.value)}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  rowPressed: { backgroundColor: colors.surfaceHover },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 3 },
  title: { ...type.bodyMedium, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meta: { ...type.small, color: colors.textMuted, flexShrink: 1 },
  metaDot: { ...type.small, color: colors.textFaint },
  attachIcon: { marginLeft: 2 },
  amount: { ...type.bodyMedium },
});
