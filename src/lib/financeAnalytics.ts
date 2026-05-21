import type { CategoryTotal, MonthlyFlow, Summary, Transaction } from '../types/finance';

export function getSummary(transactions: Transaction[]): Summary {
  return transactions.reduce<Summary>(
    (summary, transaction) => {
      if (transaction.type === 'income') summary.income += transaction.amount;
      if (transaction.type === 'expense') summary.expense += transaction.amount;
      summary.balance = summary.income - summary.expense;
      summary.count += 1;
      return summary;
    },
    { income: 0, expense: 0, balance: 0, count: 0 },
  );
}

export function getExpensesByCategory(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
    });

  return Array.from(totals, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function getMonthlyFlow(transactions: Transaction[]): MonthlyFlow[] {
  const totals = new Map<string, MonthlyFlow>();

  transactions.forEach((transaction) => {
    const month = transaction.date.includes('/') ? transaction.date.slice(3, 10) : transaction.date || 'Sem data';
    const current = totals.get(month) ?? { month, entradas: 0, gastos: 0 };

    if (transaction.type === 'income') current.entradas += transaction.amount;
    if (transaction.type === 'expense') current.gastos += transaction.amount;

    totals.set(month, current);
  });

  return Array.from(totals.values());
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
