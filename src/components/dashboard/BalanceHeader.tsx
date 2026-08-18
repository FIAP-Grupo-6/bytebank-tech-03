import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCountUp } from '@/hooks/useCountUp';
import { formatBRL } from '@/lib/format';
import { colors, spacing, type } from '@/theme';

/**
 * Saldo consolidado.
 *
 * O número sobe do zero ao valor real na abertura. Não é enfeite: dá um
 * instante de leitura antes de o usuário registrar a cifra, o que ajuda quando
 * o saldo está negativo.
 *
 * `hidden` existe porque abrir o app do banco em público é comum.
 */
export function BalanceHeader({
  balance,
  loading,
  hidden,
  onToggleHidden,
  greeting,
}: {
  balance: number;
  loading: boolean;
  hidden: boolean;
  onToggleHidden: () => void;
  greeting: string;
}) {
  const animatedBalance = useCountUp(loading ? 0 : balance);
  const isNegative = balance < 0;

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greeting}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Saldo em conta</Text>
        <Pressable
          onPress={onToggleHidden}
          hitSlop={12}
          accessibilityRole="switch"
          accessibilityState={{ checked: !hidden }}
          accessibilityLabel={hidden ? 'Mostrar saldo' : 'Ocultar saldo'}
        >
          <Ionicons
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={19}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      <Text
        style={[styles.value, isNegative && !hidden && styles.valueNegative]}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLabel={hidden ? 'Saldo oculto' : `Saldo de ${formatBRL(balance)}`}
      >
        {hidden ? '•••••••' : loading ? formatBRL(0) : formatBRL(animatedBalance)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2, marginBottom: spacing.xl },
  greeting: { ...type.small, color: colors.textMuted, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...type.label, color: colors.textFaint },
  value: { ...type.display, color: colors.text, marginTop: 2 },
  valueNegative: { color: colors.danger },
});
