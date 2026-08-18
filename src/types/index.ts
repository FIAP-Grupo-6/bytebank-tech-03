/**
 * Modelo de domínio do app.
 *
 * Mantém os mesmos nomes da Fase 2 (`Credit` / `Debit`) para o time não precisar
 * reaprender o vocabulário, mas a transação agora carrega os campos que o
 * Firestore passou a armazenar: categoria, subcategoria e recibo.
 */

export type TransactionType = 'Credit' | 'Debit';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  /** Sempre positivo. O sinal é dado pelo `type`. */
  value: number;
  category: string;
  subcategory?: string;
  description?: string;
  /** ISO 8601. No Firestore é gravado como Timestamp. */
  date: string;
  /** URL pública do recibo no bucket do Supabase Storage. */
  receiptUrl?: string;
  /** Caminho no bucket, necessário para apagar o arquivo depois. */
  receiptPath?: string;
  receiptName?: string;
  receiptType?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload de escrita: sem os campos que o servidor controla. */
export type TransactionInput = Omit<
  Transaction,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

export interface TransactionFilters {
  type: TransactionType | 'all';
  category: string | null;
  /** ISO date (yyyy-MM-dd), comparado a partir do início do dia. */
  dateFrom: string | null;
  /** ISO date (yyyy-MM-dd), comparado até o fim do dia. */
  dateTo: string | null;
  /**
   * Busca textual. O Firestore não faz busca por substring, então este filtro
   * é aplicado no cliente sobre as páginas já carregadas (ver README).
   */
  search: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  type: 'all',
  category: null,
  dateFrom: null,
  dateTo: null,
  search: '',
};

/** Cursor opaco do Firestore (um QueryDocumentSnapshot). */
export type PageCursor = unknown;

export interface Page<T> {
  items: T[];
  cursor: PageCursor | null;
  hasMore: boolean;
}

/** Saldo consolidado, vem de agregação server-side, não da lista paginada. */
export interface BalanceSummary {
  totalCredit: number;
  totalDebit: number;
  balance: number;
}

export interface CategorySlice {
  category: string;
  total: number;
  /** Fração de 0 a 1. */
  share: number;
  color: string;
}

export interface MonthPoint {
  /** yyyy-MM */
  key: string;
  /** Rótulo curto: "fev" */
  label: string;
  credit: number;
  debit: number;
  /** Saldo do mês (credit - debit). */
  balance: number;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
}
