export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  source: string;
};

export type CategoryRule = {
  category: string;
  keywords: string[];
};

export type Summary = {
  income: number;
  expense: number;
  balance: number;
  count: number;
};

export type CategoryTotal = {
  name: string;
  value: number;
};

export type MonthlyFlow = {
  month: string;
  entradas: number;
  gastos: number;
};
