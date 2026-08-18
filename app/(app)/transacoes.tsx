import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FiltersSheet } from '@/components/transactions/FiltersSheet';
import { TransactionListItem } from '@/components/transactions/TransactionListItem';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { confirm, notify } from '@/lib/alert';
import { formatDateBR, fromISODate } from '@/lib/date';
import { colors, radius, spacing, type } from '@/theme';
import { EMPTY_FILTERS, type Transaction } from '@/types';

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    items,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    filters,
    activeFilterCount,
    applyFilters,
    setSearch,
    clearFilters,
    loadMore,
    refresh,
    removeTransaction,
  } = useTransactions();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchDraft, 300);
  /** Transação com o menu de ações (Editar/Excluir) aberto pelo long-press. */
  const [menuTransaction, setMenuTransaction] = useState<Transaction | null>(null);

  // A busca vai para o contexto só depois do debounce.
  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  const handleMenuSelect = (option: string) => {
    const transaction = menuTransaction;
    if (!transaction) return;

    if (option === 'Editar') {
      router.push(`/transacao/${transaction.id}`);
      return;
    }

    confirm(
      'Excluir transação?',
      'Esta ação não pode ser desfeita. O recibo anexado também será apagado.',
      'Excluir',
      async () => {
        try {
          await removeTransaction(transaction);
        } catch (caught) {
          notify(
            'Não foi possível excluir',
            caught instanceof Error ? caught.message : 'Tente novamente.'
          );
        }
      },
      { cancelLabel: 'Manter', destructive: true }
    );
  };

  /** Chips do que está aplicado, cada um removível individualmente. */
  const activeChips = () => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (filters.type !== 'all') {
      chips.push({
        key: 'type',
        label: filters.type === 'Credit' ? 'Entradas' : 'Saídas',
        onRemove: () => applyFilters({ ...filters, type: 'all' }),
      });
    }
    if (filters.category) {
      chips.push({
        key: 'category',
        label: filters.category,
        onRemove: () => applyFilters({ ...filters, category: null }),
      });
    }
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? formatDateBR(fromISODate(filters.dateFrom)) : '…';
      const to = filters.dateTo ? formatDateBR(fromISODate(filters.dateTo)) : 'hoje';
      chips.push({
        key: 'period',
        label: `${from} — ${to}`,
        onRemove: () => applyFilters({ ...filters, dateFrom: null, dateTo: null }),
      });
    }

    return chips;
  };

  const chips = activeChips();

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Transações</Text>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={
              activeFilterCount > 0
                ? `Filtros, ${activeFilterCount} ativos`
                : 'Abrir filtros'
            }
          >
            <Ionicons name="options-outline" size={19} color={colors.text} />
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Input
          label=""
          placeholder="Buscar por descrição ou categoria"
          value={searchDraft}
          onChangeText={setSearchDraft}
          autoCapitalize="none"
          returnKeyType="search"
          containerStyle={styles.search}
          trailing={
            searchDraft ? (
              <Pressable
                onPress={() => setSearchDraft('')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Limpar busca"
              >
                <Ionicons name="close-circle" size={18} color={colors.textFaint} />
              </Pressable>
            ) : (
              <Ionicons name="search" size={18} color={colors.textFaint} />
            )
          }
        />

        {chips.length > 0 && (
          <View style={styles.chipRow}>
            {chips.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                selected
                onRemove={chip.onRemove}
              />
            ))}
            <Pressable
              onPress={() => {
                setSearchDraft('');
                clearFilters();
              }}
              style={styles.clearAll}
              accessibilityRole="button"
            >
              <Text style={styles.clearAllText}>Limpar tudo</Text>
            </Pressable>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            onPress={() => router.push(`/transacao/${item.id}`)}
            onLongPress={() => setMenuTransaction(item)}
          />
        )}
        // Dispara a próxima página quando faltar meia tela para o fim.
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : activeFilterCount > 0 ? (
            <EmptyState
              icon="funnel-outline"
              title="Nada encontrado"
              description="Nenhuma transação combina com esses filtros. Tente ampliar o período ou remover uma categoria."
              actionLabel="Limpar filtros"
              onAction={() => {
                setSearchDraft('');
                applyFilters(EMPTY_FILTERS);
              }}
            />
          ) : (
            <EmptyState
              title="Sua primeira transação"
              description="Lance uma entrada ou saída para começar a acompanhar seu dinheiro."
              actionLabel="Nova transação"
              onAction={() => router.push('/transacao/nova')}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : !hasMore && items.length > 0 ? (
            <Text style={styles.endOfList}>
              {filters.search.trim()
                ? 'Fim dos resultados carregados.'
                : 'Você chegou ao fim.'}
            </Text>
          ) : null
        }
      />

      <Pressable
        onPress={() => router.push('/transacao/nova')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="Nova transação"
      >
        <Ionicons name="add" size={26} color={colors.backgroundDeep} />
      </Pressable>

      <FiltersSheet
        visible={filtersOpen}
        filters={filters}
        onApply={applyFilters}
        onClose={() => setFiltersOpen(false)}
      />

      <OptionSheet
        visible={!!menuTransaction}
        title={
          menuTransaction
            ? menuTransaction.description?.trim() || menuTransaction.category
            : ''
        }
        options={['Editar', 'Excluir']}
        selected={null}
        onSelect={handleMenuSelect}
        onClose={() => setMenuTransaction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.backgroundDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...type.h1, color: colors.text },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...type.small, fontSize: 10, color: colors.backgroundDeep },
  search: { marginTop: -spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  clearAll: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  clearAllText: { ...type.smallMedium, color: colors.textMuted },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { ...type.small, color: colors.danger, flex: 1 },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 3,
  },
  loading: { paddingVertical: spacing.xxl },
  footerLoading: { paddingVertical: spacing.xl },
  endOfList: {
    ...type.small,
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
