import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { PickerField } from '@/components/ui/Input';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { DateField } from '@/components/transactions/DateField';
import { ALL_CATEGORY_NAMES } from '@/lib/categories';
import { subMonths, toISODate } from '@/lib/date';
import { colors, radius, spacing, type } from '@/theme';
import { EMPTY_FILTERS, type TransactionFilters, type TransactionType } from '@/types';

interface FiltersSheetProps {
  visible: boolean;
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
}

const TYPE_OPTIONS: { label: string; value: TransactionType | 'all' }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Entradas', value: 'Credit' },
  { label: 'Saídas', value: 'Debit' },
];

/** Períodos prontos, cobrem quase todo uso real e poupam dois toques. */
const PRESETS = [
  { label: 'Últimos 7 dias', months: 0, days: 7 },
  { label: 'Este mês', months: 0, days: 0 },
  { label: 'Últimos 3 meses', months: 3, days: 0 },
] as const;

/**
 * Filtros avançados.
 *
 * O rascunho fica em estado local e só vai para o contexto no "Aplicar". Assim
 * cada toque não dispara uma consulta nova no Firestore: mexer em quatro
 * filtros custaria quatro leituras da coleção.
 */
export function FiltersSheet({ visible, filters, onApply, onClose }: FiltersSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<TransactionFilters>(filters);
  const [categorySheet, setCategorySheet] = useState(false);

  // Reabrir a folha precisa refletir o que está aplicado hoje.
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    const today = new Date();
    let from: Date;

    if (preset.days > 0) {
      from = new Date(today);
      from.setDate(from.getDate() - preset.days);
    } else if (preset.months > 0) {
      from = subMonths(today, preset.months);
    } else {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    setDraft((current) => ({
      ...current,
      dateFrom: toISODate(from),
      dateTo: toISODate(today),
    }));
  };

  const hasAnything =
    draft.type !== 'all' || draft.category || draft.dateFrom || draft.dateTo;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <Text style={styles.title}>Filtrar transações</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fechar filtros"
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <SectionLabel>Tipo</SectionLabel>
            <View style={styles.chipRow}>
              {TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={draft.type === option.value}
                  onPress={() => setDraft((current) => ({ ...current, type: option.value }))}
                />
              ))}
            </View>
          </View>

          <View>
            <SectionLabel>Categoria</SectionLabel>
            <PickerField
              label=""
              value={draft.category}
              placeholder="Todas as categorias"
              onPress={() => setCategorySheet(true)}
              trailing={
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              }
            />
          </View>

          <View>
            <SectionLabel>Período</SectionLabel>

            <View style={styles.chipRow}>
              {PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  onPress={() => applyPreset(preset)}
                />
              ))}
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <DateField
                  label="De"
                  value={draft.dateFrom ? `${draft.dateFrom}T12:00:00` : ''}
                  placeholder="Início"
                  maximumDate={new Date()}
                  onChange={(iso) =>
                    setDraft((current) => ({ ...current, dateFrom: toISODate(new Date(iso)) }))
                  }
                  onClear={() => setDraft((current) => ({ ...current, dateFrom: null }))}
                />
              </View>
              <View style={styles.dateCol}>
                <DateField
                  label="Até"
                  value={draft.dateTo ? `${draft.dateTo}T12:00:00` : ''}
                  placeholder="Fim"
                  maximumDate={new Date()}
                  minimumDate={
                    draft.dateFrom ? new Date(`${draft.dateFrom}T12:00:00`) : undefined
                  }
                  onChange={(iso) =>
                    setDraft((current) => ({ ...current, dateTo: toISODate(new Date(iso)) }))
                  }
                  onClear={() => setDraft((current) => ({ ...current, dateTo: null }))}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Limpar"
            variant="secondary"
            disabled={!hasAnything}
            onPress={() => setDraft({ ...EMPTY_FILTERS, search: draft.search })}
            style={styles.footerButton}
          />
          <Button
            label="Aplicar"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={styles.footerButtonWide}
          />
        </View>
      </View>

      <OptionSheet
        visible={categorySheet}
        title="Categoria"
        options={ALL_CATEGORY_NAMES}
        selected={draft.category}
        clearLabel="Todas as categorias"
        onClear={() => setDraft((current) => ({ ...current, category: null }))}
        onSelect={(category) => setDraft((current) => ({ ...current, category }))}
        onClose={() => setCategorySheet(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...type.h2, color: colors.text },
  body: { paddingHorizontal: spacing.lg },
  bodyContent: { gap: spacing.xl, paddingBottom: spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  dateCol: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: { flex: 1 },
  footerButtonWide: { flex: 2 },
});
