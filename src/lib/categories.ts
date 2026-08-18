import type { TransactionType } from '@/types';

/**
 * Mesmo catálogo de categorias da Fase 2, para o histórico do usuário continuar
 * fazendo sentido entre a web e o app.
 */

export interface CategoryOption {
  value: string;
  subcategories: string[];
}

export const CREDIT_CATEGORIES: CategoryOption[] = [
  {
    value: 'Trabalho',
    subcategories: ['Salário', 'Freelance', 'Bônus', 'Comissão', 'Hora extra', 'Adiantamento'],
  },
  {
    value: 'Investimentos',
    subcategories: ['Dividendos', 'Rendimentos', 'Venda de ativos', 'Juros', 'Fundos imobiliários'],
  },
  {
    value: 'Transferência recebida',
    subcategories: ['Pix recebido', 'TED/DOC recebido', 'Devolução', 'Reembolso'],
  },
  {
    value: 'Aluguel',
    subcategories: ['Aluguel residencial', 'Aluguel comercial', 'Temporada'],
  },
  {
    value: 'Outros',
    subcategories: ['Presente', 'Herança', 'Prêmio', 'Cashback', 'Outros'],
  },
];

export const DEBIT_CATEGORIES: CategoryOption[] = [
  {
    value: 'Alimentação',
    subcategories: ['Restaurante', 'Supermercado', 'Delivery', 'Padaria', 'Lanche', 'Cafeteria', 'Feira'],
  },
  {
    value: 'Transporte',
    subcategories: ['Combustível', 'Uber/99', 'Transporte público', 'Estacionamento', 'Manutenção veículo', 'Pedágio'],
  },
  {
    value: 'Moradia',
    subcategories: ['Aluguel', 'Condomínio', 'Conta de luz', 'Conta de água', 'Internet', 'Gás', 'IPTU'],
  },
  {
    value: 'Saúde',
    subcategories: ['Farmácia', 'Consulta médica', 'Exame', 'Plano de saúde', 'Academia', 'Dentista', 'Psicólogo'],
  },
  {
    value: 'Lazer',
    subcategories: ['Cinema/Teatro', 'Streaming', 'Viagem', 'Esportes', 'Jogos', 'Eventos', 'Restaurante especial'],
  },
  {
    value: 'Educação',
    subcategories: ['Curso', 'Livros', 'Escola/Faculdade', 'Material escolar', 'Assinatura', 'Idiomas'],
  },
  {
    value: 'Vestuário',
    subcategories: ['Roupas', 'Calçados', 'Acessórios', 'Moda íntima'],
  },
  {
    value: 'Casa',
    subcategories: ['Móveis', 'Eletrodomésticos', 'Decoração', 'Reforma', 'Limpeza', 'Jardinagem'],
  },
  {
    value: 'Transferência enviada',
    subcategories: ['Pix enviado', 'TED/DOC enviado', 'Boleto', 'Empréstimo'],
  },
  {
    value: 'Outros',
    subcategories: ['Presente', 'Doação', 'Pet', 'Serviços domésticos', 'Assinatura', 'Outros'],
  },
];

export function getCategoriesByType(type: TransactionType): CategoryOption[] {
  return type === 'Credit' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
}

export function getCategoryNames(type: TransactionType): string[] {
  return getCategoriesByType(type).map((category) => category.value);
}

export function getSubcategories(type: TransactionType, category: string): string[] {
  return getCategoriesByType(type).find((item) => item.value === category)?.subcategories ?? [];
}

/** Usado na validação: a categoria precisa pertencer ao tipo escolhido. */
export function isValidCategory(type: TransactionType, category: string): boolean {
  return getCategoryNames(type).includes(category);
}

export function isValidSubcategory(
  type: TransactionType,
  category: string,
  subcategory: string
): boolean {
  return getSubcategories(type, category).includes(subcategory);
}

/** Todas as categorias, sem repetir. Alimenta o filtro da listagem. */
export const ALL_CATEGORY_NAMES: string[] = Array.from(
  new Set([...CREDIT_CATEGORIES, ...DEBIT_CATEGORIES].map((item) => item.value))
).sort((a, b) => a.localeCompare(b, 'pt-BR'));
