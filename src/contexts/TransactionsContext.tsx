import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme';
import { lastMonths, monthKey, monthLabel } from '@/lib/date';
import { toFriendlyMessage } from '@/lib/errors';
import {
  ANALYTICS_MONTHS,
  applyClientSearch,
  createTransaction,
  deleteTransaction,
  fetchBalanceSummary,
  fetchTransactionsPage,
  updateTransaction,
  watchAnalyticsWindow,
} from '@/services/transactions.service';
import { deleteReceipt } from '@/services/receipts.service';
import {
  EMPTY_FILTERS,
  type BalanceSummary,
  type CategorySlice,
  type MonthPoint,
  type PageCursor,
  type Transaction,
  type TransactionFilters,
  type TransactionInput,
} from '@/types';

/** Quantas fatias o gráfico de categorias mostra antes de agrupar em "Outras". */
const MAX_CATEGORY_SLICES = 6;

interface TransactionsContextValue {
  // Listagem paginada
  /** Já com a busca textual aplicada no cliente. */
  items: Transaction[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  filters: TransactionFilters;
  activeFilterCount: number;
  applyFilters: (next: TransactionFilters) => void;
  setSearch: (term: string) => void;
  clearFilters: () => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Dashboard
  summary: BalanceSummary | null;
  analyticsLoading: boolean;
  /** Gastos por categoria nos últimos 6 meses. */
  categorySlices: CategorySlice[];
  /** Série mensal de entradas e saídas. */
  monthSeries: MonthPoint[];
  recent: Transaction[];

  // Escrita
  saveTransaction: (input: TransactionInput, id?: string) => Promise<void>;
  removeTransaction: (transaction: Transaction) => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

/**
 * Identidade só dos filtros que vão para o Firestore.
 * `search` fica fora de propósito: mudar a busca não deve refazer a consulta,
 * porque ela é resolvida no cliente.
 */
function queryKeyOf(filters: TransactionFilters): string {
  return [filters.type, filters.category ?? '', filters.dateFrom ?? '', filters.dateTo ?? ''].join(
    '|'
  );
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [rawItems, setRawItems] = useState<Transaction[]>([]);
  const [cursor, setCursor] = useState<PageCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);

  const [analytics, setAnalytics] = useState<Transaction[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);

  /**
   * Cada carga recebe um número. Só a mais recente pode escrever no estado,
   * o que evita a página antiga sobrescrever a nova quando o usuário troca de
   * filtro antes da primeira resposta chegar.
   */
  const requestId = useRef(0);
  const queryKey = queryKeyOf(filters);

  const loadFirstPage = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!userId) return;

      const id = ++requestId.current;
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const page = await fetchTransactionsPage(userId, filters, null);
        if (id !== requestId.current) return;

        setRawItems(page.items);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
      } catch (caught) {
        if (id !== requestId.current) return;
        setError(toFriendlyMessage(caught, 'Não foi possível carregar as transações.'));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // `filters` inteiro entraria em loop com a busca; a chave cobre o que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, queryKey]
  );

  /** Próxima página, chamada pelo `onEndReached` da FlatList. */
  const loadMore = useCallback(async () => {
    if (!userId || !cursor || !hasMore || loadingMore || loading) return;

    const id = requestId.current;
    setLoadingMore(true);

    try {
      const page = await fetchTransactionsPage(userId, filters, cursor);
      if (id !== requestId.current) return;

      setRawItems((current) => {
        // Concatenar às cegas duplicaria itens se o onEndReached disparar duas
        // vezes seguidas, o que acontece em scroll rápido.
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      if (id !== requestId.current) return;
      setError(toFriendlyMessage(caught, 'Não foi possível carregar mais transações.'));
    } finally {
      setLoadingMore(false);
    }
  }, [userId, cursor, hasMore, loadingMore, loading, filters]);

  const refreshBalance = useCallback(async () => {
    if (!userId) return;
    try {
      setSummary(await fetchBalanceSummary(userId));
    } catch (caught) {
      if (__DEV__) console.warn('[transactions] saldo indisponível', caught);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    await Promise.all([loadFirstPage('refresh'), refreshBalance()]);
  }, [loadFirstPage, refreshBalance]);

  // Primeira carga e recarga a cada mudança de filtro de consulta.
  useEffect(() => {
    if (!userId) {
      setRawItems([]);
      setCursor(null);
      setHasMore(false);
      setSummary(null);
      setAnalytics([]);
      return;
    }
    void loadFirstPage('initial');
  }, [userId, loadFirstPage]);

  // Janela de 6 meses em tempo real: alimenta os gráficos e serve de gatilho
  // para recalcular o saldo agregado quando algo muda no servidor.
  useEffect(() => {
    if (!userId) return;

    setAnalyticsLoading(true);
    const unsubscribe = watchAnalyticsWindow(
      userId,
      (items) => {
        setAnalytics(items);
        setAnalyticsLoading(false);
        void refreshBalance();
      },
      (caught) => {
        setAnalyticsLoading(false);
        setError(toFriendlyMessage(caught, 'Não foi possível carregar os gráficos.'));
      }
    );

    return unsubscribe;
  }, [userId, refreshBalance]);

  // Filtros

  const applyFilters = useCallback((next: TransactionFilters) => {
    setFilters(next);
  }, []);

  const setSearch = useCallback((term: string) => {
    setFilters((current) => ({ ...current, search: term }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count += 1;
    if (filters.category) count += 1;
    if (filters.dateFrom || filters.dateTo) count += 1;
    if (filters.search.trim()) count += 1;
    return count;
  }, [filters]);

  const items = useMemo(
    () => applyClientSearch(rawItems, filters.search),
    [rawItems, filters.search]
  );

  // Derivados do dashboard

  const categorySlices = useMemo<CategorySlice[]>(() => {
    const spending = analytics.filter((item) => item.type === 'Debit');
    if (spending.length === 0) return [];

    const totals = new Map<string, number>();
    for (const item of spending) {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.value);
    }

    const ordered = [...totals.entries()].sort(([, a], [, b]) => b - a);
    const head = ordered.slice(0, MAX_CATEGORY_SLICES);
    const tail = ordered.slice(MAX_CATEGORY_SLICES);

    // O rabo longo vira uma fatia só: dez fatias de 1% viram ruído visual.
    const grouped: [string, number][] = tail.length
      ? [...head, ['Outras', tail.reduce((acc, [, value]) => acc + value, 0)]]
      : head;

    const total = grouped.reduce((acc, [, value]) => acc + value, 0);

    return grouped.map(([category, value], index) => ({
      category,
      total: value,
      share: total > 0 ? value / total : 0,
      color: colors.chart[index % colors.chart.length] ?? colors.primary,
    }));
  }, [analytics]);

  const monthSeries = useMemo<MonthPoint[]>(() => {
    const buckets = new Map<string, { credit: number; debit: number }>();

    for (const item of analytics) {
      const key = monthKey(new Date(item.date));
      const bucket = buckets.get(key) ?? { credit: 0, debit: 0 };
      if (item.type === 'Credit') bucket.credit += item.value;
      else bucket.debit += item.value;
      buckets.set(key, bucket);
    }

    // Parte dos meses do calendário, não das chaves encontradas: mês sem
    // movimento tem que aparecer como zero, senão o gráfico "pula" meses.
    return lastMonths(ANALYTICS_MONTHS).map((date) => {
      const key = monthKey(date);
      const bucket = buckets.get(key) ?? { credit: 0, debit: 0 };
      return {
        key,
        label: monthLabel(date),
        credit: bucket.credit,
        debit: bucket.debit,
        balance: bucket.credit - bucket.debit,
      };
    });
  }, [analytics]);

  const recent = useMemo(() => analytics.slice(0, 5), [analytics]);

  // Escrita

  const saveTransaction = useCallback(
    async (input: TransactionInput, id?: string) => {
      if (!userId) throw new Error('Sessão expirada. Entre novamente.');

      try {
        if (id) await updateTransaction(id, input);
        else await createTransaction(userId, input);
      } catch (caught) {
        throw new Error(toFriendlyMessage(caught, 'Não foi possível salvar a transação.'));
      }

      await Promise.all([
        loadFirstPage('refresh'),
        refreshBalance()
      ])      
    },
    [userId, loadFirstPage, refreshBalance]
  );

  const removeTransaction = useCallback(
    async (transaction: Transaction) => {
      try {
        await Promise.all([
          deleteTransaction(transaction.id),
          transaction.receiptPath ? deleteReceipt(transaction.receiptPath) : Promise.resolve()
        ])
      } catch (caught) {
        throw new Error(toFriendlyMessage(caught, 'Não foi possível excluir a transação.'));
      }

      // Remoção otimista: o item sai da tela na hora, sem esperar a recarga.
      setRawItems((current) => current.filter((item) => item.id !== transaction.id));
      await refreshBalance();
    },
    [refreshBalance]
  );

  const value = useMemo<TransactionsContextValue>(
    () => ({
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
      summary,
      analyticsLoading,
      categorySlices,
      monthSeries,
      recent,
      saveTransaction,
      removeTransaction,
    }),
    [
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
      summary,
      analyticsLoading,
      categorySlices,
      monthSeries,
      recent,
      saveTransaction,
      removeTransaction,
    ]
  );

  return (
    <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
  );
}

export function useTransactions(): TransactionsContextValue {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions precisa estar dentro de <TransactionsProvider>.');
  }
  return context;
}
