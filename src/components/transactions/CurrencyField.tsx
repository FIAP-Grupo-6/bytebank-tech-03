import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, type } from '@/theme';

interface CurrencyFieldProps {
  label: string;
  /** Valor em reais, ex.: 1234.56 */
  value: number;
  onChange: (value: number) => void;
  error?: string;
  /** Colore o valor conforme entrada ou saída. */
  tone?: 'credit' | 'debit';
}

/** 123456 centavos → "1.234,56" */
function centsToMask(cents: number): string {
  const reais = Math.floor(Math.abs(cents) / 100);
  const rest = String(Math.abs(cents) % 100).padStart(2, '0');
  return `${reais.toLocaleString('pt-BR')},${rest}`;
}

/**
 * Campo de dinheiro.
 *
 * A digitação é sempre da direita para a esquerda em centavos, o mesmo
 * comportamento de maquininha e de app de banco. Isso evita o problema clássico
 * de máscara por regex, em que apagar um caractere no meio embaralha o valor.
 *
 * A fonte da verdade é a quantidade de centavos (inteiro). Trabalhar em float
 * desde o input é o que produz aqueles `19.999999999999998`.
 */
export function CurrencyField({
  label,
  value,
  onChange,
  error,
  tone = 'debit',
}: CurrencyFieldProps) {
  const [cents, setCents] = useState(() => Math.round(value * 100));
  const [focused, setFocused] = useState(false);

  // Sincroniza quando o valor vem de fora (ex.: ao abrir para editar).
  useEffect(() => {
    const incoming = Math.round(value * 100);
    if (incoming !== cents) setCents(incoming);
    // Só reage a mudanças externas; `cents` de propósito fora das deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    const nextCents = digits ? Number.parseInt(digits, 10) : 0;

    setCents(nextCents);
    onChange(nextCents / 100);
  };

  const accent = tone === 'credit' ? colors.primary : colors.danger;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.field,
          focused && { borderColor: accent },
          !!error && styles.fieldError,
        ]}
      >
        <Text style={[styles.prefix, { color: accent }]}>R$</Text>
        <TextInput
          value={centsToMask(cents)}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: accent }]}
          accessibilityLabel={label}
          accessibilityHint={error}
          // No iOS o cursor iria para onde o usuário tocasse, quebrando a
          // digitação da direita para a esquerda.
          selection={{ start: centsToMask(cents).length, end: centsToMask(cents).length }}
        />
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  fieldError: { borderColor: colors.danger },
  prefix: { ...type.h2 },
  input: { flex: 1, ...type.display, fontSize: 26, padding: 0 },
  error: { ...type.small, color: colors.danger },
});
