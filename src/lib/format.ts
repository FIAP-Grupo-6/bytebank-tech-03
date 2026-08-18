import type { TransactionType } from '@/types';

/**
 * O Hermes do RN 0.86 já traz Intl completo, então dá pra usar
 * `Intl.NumberFormat` direto, mesmas funções da Fase 2.
 */

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatAbsoluteBRL(value: number): string {
  return formatBRL(Math.abs(value));
}

/** Só os dígitos, sem símbolo, pra usar dentro de inputs. */
export function formatDecimal(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Compacta valores grandes nos eixos dos gráficos: 12500 → "12,5 mil". */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${formatDecimal(value / 1_000_000).replace(',00', '')} mi`;
  if (abs >= 1_000) return `${formatDecimal(value / 1_000).replace(',00', '')} mil`;
  return String(Math.round(value));
}

/** Valor assinado conforme o tipo: entrada soma, saída subtrai. */
export function signedValue(type: TransactionType, value: number): number {
  return type === 'Credit' ? value : -value;
}

export function formatSigned(type: TransactionType, value: number): string {
  const prefix = type === 'Credit' ? '+' : '−';
  return `${prefix} ${formatBRL(Math.abs(value))}`;
}
