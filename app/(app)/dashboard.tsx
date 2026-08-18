import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DonutChart } from '@/components/charts/DonutChart';
import { GroupedBarChart } from '@/components/charts/GroupedBarChart';
import { BalanceHeader } from '@/components/dashboard/BalanceHeader';
import { SectionSwitcher, type Section } from '@/components/dashboard/SectionSwitcher';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { TransactionListItem } from '@/components/transactions/TransactionListItem';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/contexts/TransactionsContext';
import { formatBRL } from '@/lib/format';
import { colors, radius, spacing, type } from '@/theme';

function greetingFor(name: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return `${period}, ${name.split(' ')[0]}`;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const {
    summary,
    analyticsLoading,
    categorySlices,
    monthSeries,
    recent,
    refreshing,
    refresh,
  } = useTransactions();

  const [balanceHidden, setBalanceHidden] = useState(false);

  const chartWidth = width - spacing.xl * 2 - spacing.lg * 2;
  const totalSpending = useMemo(
    () => categorySlices.reduce((accumulator, slice) => accumulator + slice.total, 0),
    [categorySlices]
  );

  const sections: Section[] = [
    {
      key: 'overview',
      label: 'Visão geral',
      render: () => (
        <View style={styles.sectionBody}>
          <SummaryCards
            totalCredit={summary?.totalCredit ?? 0}
            totalDebit={summary?.totalDebit ?? 0}
          />

          <View>
            <SectionLabel>Últimos lançamentos</SectionLabel>
            <Card style={styles.listCard}>
              {recent.length === 0 ? (
                <EmptyState
                  title="Nada lançado ainda"
                  description="Registre sua primeira transação para o dashboard começar a fazer sentido."
                  actionLabel="Nova transação"
                  onAction={() => router.push('/transacao/nova')}
                />
              ) : (
                recent.map((transaction) => (
                  <TransactionListItem
                    key={transaction.id}
                    transaction={transaction}
                    onPress={() => router.push(`/transacao/${transaction.id}`)}
                    onLongPress={() => router.push(`/transacao/${transaction.id}`)}
                  />
                ))
              )}
            </Card>

            {recent.length > 0 && (
              <Pressable
                onPress={() => router.push('/transacoes')}
                style={styles.seeAll}
                accessibilityRole="button"
              >
                <Text style={styles.seeAllText}>Ver todas as transações</Text>
                <Ionicons name="arrow-forward" size={15} color={colors.primary} />
              </Pressable>
            )}
          </View>
        </View>
      ),
    },
    {
      key: 'categories',
      label: 'Categorias',
      render: () => (
        <View style={styles.sectionBody}>
          <Card>
            {categorySlices.length === 0 ? (
              <EmptyState
                icon="pie-chart-outline"
                title="Sem gastos no período"
                description="Quando você registrar saídas nos últimos 6 meses, elas aparecem divididas por categoria aqui."
              />
            ) : (
              <>
                <DonutChart
                  slices={categorySlices}
                  centerValue={totalSpending}
                  centerLabel="Total gasto"
                />

                <View style={styles.legend}>
                  {categorySlices.map((slice) => (
                    <View key={slice.category} style={styles.legendRow}>
                      <View style={[styles.dot, { backgroundColor: slice.color }]} />
                      <Text style={styles.legendLabel} numberOfLines={1}>
                        {slice.category}
                      </Text>
                      <Text style={styles.legendShare}>
                        {Math.round(slice.share * 100)}%
                      </Text>
                      <Text style={styles.legendValue}>{formatBRL(slice.total)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>

          <Text style={styles.footnote}>
            Considera apenas saídas dos últimos 6 meses.
          </Text>
        </View>
      ),
    },
    {
      key: 'evolution',
      label: 'Evolução',
      render: () => (
        <View style={styles.sectionBody}>
          <Card>
            <View style={styles.chartLegend}>
              <View style={styles.chartLegendItem}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Text style={styles.chartLegendText}>Entradas</Text>
              </View>
              <View style={styles.chartLegendItem}>
                <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                <Text style={styles.chartLegendText}>Saídas</Text>
              </View>
            </View>

            <GroupedBarChart data={monthSeries} width={chartWidth} />
          </Card>

          <Card>
            <SectionLabel>Saldo por mês</SectionLabel>
            {monthSeries.map((point) => (
              <View key={point.key} style={styles.monthRow}>
                <Text style={styles.monthLabel}>{point.label}</Text>
                <Text
                  style={[
                    styles.monthValue,
                    point.balance < 0 && { color: colors.danger },
                    point.balance > 0 && { color: colors.primary },
                  ]}
                >
                  {point.credit === 0 && point.debit === 0
                    ? '—'
                    : formatBRL(point.balance)}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <BalanceHeader
          greeting={greetingFor(user?.displayName ?? 'Você')}
          balance={summary?.balance ?? 0}
          loading={analyticsLoading && !summary}
          hidden={balanceHidden}
          onToggleHidden={() => setBalanceHidden((current) => !current)}
        />

        {analyticsLoading && !summary ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Carregando seus dados…</Text>
          </View>
        ) : (
          <SectionSwitcher sections={sections} />
        )}
      </ScrollView>

      {/* Botão flutuante: a ação mais frequente do app não deve depender de
          navegar até outra aba primeiro. */}
      <Pressable
        onPress={() => router.push('/transacao/nova')}
        style={({ pressed }) => [
          styles.fab,
          { bottom: spacing.lg },
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Nova transação"
      >
        <Ionicons name="add" size={26} color={colors.backgroundDeep} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  sectionBody: { gap: spacing.xl },
  listCard: { padding: spacing.xs },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  loadingText: { ...type.small, color: colors.textMuted },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  seeAllText: { ...type.smallMedium, color: colors.primary },
  legend: { marginTop: spacing.xl, gap: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { ...type.small, color: colors.text, flex: 1 },
  legendShare: { ...type.small, color: colors.textFaint, width: 38, textAlign: 'right' },
  legendValue: {
    ...type.smallMedium,
    color: colors.textMuted,
    width: 92,
    textAlign: 'right',
  },
  footnote: { ...type.small, color: colors.textFaint, textAlign: 'center' },
  chartLegend: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chartLegendText: { ...type.small, color: colors.textMuted },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthLabel: { ...type.bodyMedium, color: colors.text, textTransform: 'capitalize' },
  monthValue: { ...type.bodyMedium, color: colors.textMuted },
  fab: {
    position: 'absolute',
    right: spacing.xl,
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
