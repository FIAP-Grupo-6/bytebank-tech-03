import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  sum,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { endOfDay, fromISODate, startOfDay, startOfMonth, subMonths } from '@/lib/date';
import type {
  BalanceSummary,
  Page,
  PageCursor,
  Transaction,
  TransactionFilters,
  TransactionInput,
} from '@/types';

export const TRANSACTIONS = 'transactions';
export const PAGE_SIZE = 15;
/** Janela usada pelos gráficos do dashboard. */
export const ANALYTICS_MONTHS = 6;

const collectionRef = collection(db, TRANSACTIONS);

/**
 * Converte o documento do Firestore para o modelo do app.
 * A fronteira de conversão vive aqui e só aqui: nenhuma tela precisa saber que
 * `date` é um Timestamp lá dentro.
 */
function toTransaction(snapshot: QueryDocumentSnapshot<DocumentData>): Transaction {
  const data = snapshot.data();
  const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);

  return {
    id: snapshot.id,
    userId: data.userId,
    type: data.type,
    value: Number(data.value ?? 0),
    category: data.category ?? '',
    subcategory: data.subcategory ?? undefined,
    description: data.description ?? undefined,
    date: date.toISOString(),
    receiptUrl: data.receiptUrl ?? undefined,
    receiptPath: data.receiptPath ?? undefined,
    receiptName: data.receiptName ?? undefined,
    receiptType: data.receiptType ?? undefined,
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
  };
}

/**
 * Monta os `where` da consulta.
 *
 * Ordem importa para o Firestore casar com o índice composto: igualdades
 * primeiro, faixa depois, `orderBy` no mesmo campo da faixa. Os índices
 * necessários estão em `firebase/firestore.indexes.json`.
 *
 * `filters.search` não entra aqui de propósito: o Firestore não faz busca por
 * substring. Ela é aplicada no cliente (ver `applyClientSearch`).
 */
function buildConstraints(userId: string, filters: TransactionFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [where('userId', '==', userId)];

  if (filters.type !== 'all') {
    constraints.push(where('type', '==', filters.type));
  }
  if (filters.category) {
    constraints.push(where('category', '==', filters.category));
  }
  if (filters.dateFrom) {
    constraints.push(
      where('date', '>=', Timestamp.fromDate(startOfDay(fromISODate(filters.dateFrom))))
    );
  }
  if (filters.dateTo) {
    constraints.push(
      where('date', '<=', Timestamp.fromDate(endOfDay(fromISODate(filters.dateTo))))
    );
  }

  constraints.push(orderBy('date', 'desc'));
  return constraints;
}

/**
 * Busca uma página. Passar `cursor` traz a página seguinte.
 *
 * O cursor é o próprio `QueryDocumentSnapshot` do último item, não o valor do
 * campo: assim o Firestore desempata documentos com a mesma data sozinho e a
 * paginação não repete nem pula registros.
 */
export async function fetchTransactionsPage(
  userId: string,
  filters: TransactionFilters,
  cursor: PageCursor | null = null,
  pageSize = PAGE_SIZE
): Promise<Page<Transaction>> {
  const constraints = buildConstraints(userId, filters);

  if (cursor) {
    constraints.push(startAfter(cursor as QueryDocumentSnapshot<DocumentData>));
  }
  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(collectionRef, ...constraints));
  const docs = snapshot.docs;

  return {
    items: docs.map(toTransaction),
    cursor: docs.length > 0 ? (docs[docs.length - 1] ?? null) : null,
    // Página cheia = provavelmente tem mais. Página incompleta é sempre a última.
    hasMore: docs.length === pageSize,
  };
}

/** Filtro textual aplicado no cliente, sobre o que já foi carregado. */
export function applyClientSearch(items: Transaction[], search: string): Transaction[] {
  const term = search.trim().toLocaleLowerCase('pt-BR');
  if (!term) return items;

  return items.filter((item) =>
    [item.description, item.category, item.subcategory]
      .filter(Boolean)
      .some((field) => field!.toLocaleLowerCase('pt-BR').includes(term))
  );
}

/**
 * Saldo consolidado de toda a vida da conta.
 *
 * Usa agregação server-side (`sum`) em vez de baixar os documentos: o Firebase
 * cobra 1 leitura por cada 1.000 documentos agregados, então o saldo continua
 * barato e correto mesmo com anos de histórico. Somar a lista paginada daria um
 * número errado, porque a lista só tem a primeira página.
 */
export async function fetchBalanceSummary(userId: string): Promise<BalanceSummary> {
  const [credit, debit] = await Promise.all([
    getAggregateFromServer(
      query(collectionRef, where('userId', '==', userId), where('type', '==', 'Credit')),
      { total: sum('value') }
    ),
    getAggregateFromServer(
      query(collectionRef, where('userId', '==', userId), where('type', '==', 'Debit')),
      { total: sum('value') }
    ),
  ]);

  const totalCredit = Number(credit.data().total ?? 0);
  const totalDebit = Number(debit.data().total ?? 0);

  return { totalCredit, totalDebit, balance: totalCredit - totalDebit };
}

/**
 * Escuta em tempo real os últimos `months` meses. É a fonte dos gráficos.
 *
 * Aqui `onSnapshot` compensa: assim que o usuário salva uma transação, o
 * dashboard se atualiza sem nenhuma chamada extra.
 */
export function watchAnalyticsWindow(
  userId: string,
  onData: (items: Transaction[]) => void,
  onError: (error: unknown) => void,
  months = ANALYTICS_MONTHS
): () => void {
  const from = Timestamp.fromDate(startOfMonth(subMonths(new Date(), months - 1)));

  const analyticsQuery = query(
    collectionRef,
    where('userId', '==', userId),
    where('date', '>=', from),
    orderBy('date', 'desc')
  );

  return onSnapshot(
    analyticsQuery,
    (snapshot) => onData(snapshot.docs.map(toTransaction)),
    (error) => onError(error)
  );
}

export async function fetchTransactionById(id: string): Promise<Transaction | null> {
  const snapshot = await getDoc(doc(db, TRANSACTIONS, id));
  if (!snapshot.exists()) return null;
  return toTransaction(snapshot as QueryDocumentSnapshot<DocumentData>);
}

/** Remove chaves `undefined`, o Firestore rejeita esse valor. */
function toFirestorePayload(input: TransactionInput) {
  const payload: Record<string, unknown> = {
    type: input.type,
    value: input.value,
    category: input.category,
    date: Timestamp.fromDate(new Date(input.date)),
  };

  const optional = {
    subcategory: input.subcategory,
    description: input.description,
    receiptUrl: input.receiptUrl,
    receiptPath: input.receiptPath,
    receiptName: input.receiptName,
    receiptType: input.receiptType,
  };

  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined && value !== '') payload[key] = value;
  }

  return payload;
}

export async function createTransaction(
  userId: string,
  input: TransactionInput
): Promise<string> {
  const created = await addDoc(collectionRef, {
    ...toFirestorePayload(input),
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}

export async function updateTransaction(
  id: string,
  input: TransactionInput
): Promise<void> {
  await updateDoc(doc(db, TRANSACTIONS, id), {
    ...toFirestorePayload(input),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, TRANSACTIONS, id));
}
