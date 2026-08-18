import { z } from 'zod';

import { isValidCategory, isValidSubcategory } from '@/lib/categories';
import { endOfDay } from '@/lib/date';

/** Teto por transação. Precisa casar com a regra do Firestore. */
export const MAX_TRANSACTION_VALUE = 1_000_000;

/**
 * A validação simples (campo obrigatório, número positivo) fica nos validadores
 * de campo. O que o desafio chama de "validação avançada" está no `superRefine`
 * ao final: são as regras que dependem da combinação de dois ou mais campos e
 * que, por isso, nenhum validador isolado pegaria.
 */
export const transactionSchema = z
  .object({
    type: z.enum(['Credit', 'Debit'], {
      error: 'Escolha se é entrada ou saída.',
    }),

    value: z
      .number({ error: 'Informe o valor da transação.' })
      .refine((value) => Number.isFinite(value), 'Valor inválido.')
      .refine((value) => value > 0, 'O valor precisa ser maior que zero.')
      .refine(
        (value) => value <= MAX_TRANSACTION_VALUE,
        `O valor máximo por transação é de R$ ${MAX_TRANSACTION_VALUE.toLocaleString('pt-BR')}.`
      )
      .refine(
        // Dinheiro tem duas casas. 10.999 quase sempre é erro de digitação.
        (value) => Number.isInteger(Math.round(value * 100)),
        'Use no máximo duas casas decimais.'
      ),

    category: z.string().min(1, 'Escolha uma categoria.'),

    subcategory: z.string().optional(),

    description: z
      .string()
      .max(120, 'A descrição pode ter no máximo 120 caracteres.')
      .optional(),

    /** ISO 8601, vem do DateTimePicker. */
    date: z.string().min(1, 'Escolha a data da transação.'),

    receiptUrl: z.string().optional(),
    receiptPath: z.string().optional(),
    receiptName: z.string().optional(),
    receiptType: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1) A categoria tem que existir dentro do tipo escolhido. Sem isto o
    //    usuário troca de Saída para Entrada e fica com "Alimentação" numa
    //    entrada de dinheiro.
    if (data.category && !isValidCategory(data.type, data.category)) {
      ctx.addIssue({
        code: 'custom',
        path: ['category'],
        message:
          data.type === 'Credit'
            ? 'Esta categoria não vale para entradas. Escolha outra.'
            : 'Esta categoria não vale para saídas. Escolha outra.',
      });
    }

    // 2) A subcategoria precisa pertencer à categoria.
    if (
      data.subcategory &&
      data.category &&
      isValidCategory(data.type, data.category) &&
      !isValidSubcategory(data.type, data.category, data.subcategory)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['subcategory'],
        message: `"${data.subcategory}" não pertence a ${data.category}.`,
      });
    }

    // 3) Data no futuro. Um lançamento pode ser de hoje, não de semana que vem.
    const parsed = new Date(data.date);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'Data inválida.',
      });
      return;
    }
    if (parsed.getTime() > endOfDay(new Date()).getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'A data não pode estar no futuro.',
      });
    }

    // 4) Limite inferior: antes disso é quase certo erro de digitação no ano.
    if (parsed.getFullYear() < 2000) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'Confira o ano: a data parece muito antiga.',
      });
    }

    // 5) Recibo consistente: URL e caminho no bucket andam juntos, senão fica
    //    um arquivo órfão no Storage que ninguém consegue apagar.
    if (data.receiptUrl && !data.receiptPath) {
      ctx.addIssue({
        code: 'custom',
        path: ['receiptUrl'],
        message: 'O recibo não terminou de ser enviado. Anexe novamente.',
      });
    }
  });

export type TransactionFormValues = z.infer<typeof transactionSchema>;
