/**
 * Helpers de data escritos à mão de propósito: o app precisa de umas dez
 * operações simples e trazer date-fns/moment só para isso engordaria o bundle
 * sem ganho real.
 */

const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function startOfMonth(date: Date): Date {
  const copy = new Date(date);
  copy.setDate(1);
  return startOfDay(copy);
}

export function subMonths(date: Date, months: number): Date {
  const target = new Date(date);
  const originalDay = target.getDate();

  target.setDate(1);
  target.setMonth(target.getMonth() - months);

  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, daysInTargetMonth));

  return target;
}

/** Chave estável de agrupamento mensal: "2026-07". */
export function monthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

/** Rótulo curto para eixo de gráfico: "jul". */
export function monthLabel(date: Date): string {
  return MONTHS_SHORT[date.getMonth()] ?? '';
}

/** yyyy-MM-dd, formato que guardamos nos filtros. */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Interpreta "yyyy-MM-dd" no fuso local.
 * `new Date('2026-07-29')` seria lido como UTC e, no Brasil, voltaria um dia.
 */
export function fromISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** dd/MM/yyyy */
export function formatDateBR(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

/** "Hoje" / "Ontem" / "29 jul 2026", usado nos itens da lista. */
export function formatRelativeDay(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const today = new Date();
  const yesterday = subDays(today, 1);

  if (isSameDay(date, today)) return 'Hoje';
  if (isSameDay(date, yesterday)) return 'Ontem';

  const day = String(date.getDate()).padStart(2, '0');
  const label = MONTHS_SHORT[date.getMonth()] ?? '';
  return date.getFullYear() === today.getFullYear()
    ? `${day} ${label}`
    : `${day} ${label} ${date.getFullYear()}`;
}

export function subDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - amount);
  return copy;
}

/** Últimos `count` meses, do mais antigo ao mais recente. */
export function lastMonths(count: number, reference = new Date()): Date[] {
  return Array.from({ length: count }, (_, index) =>
    startOfMonth(subMonths(reference, count - 1 - index))
  );
}
