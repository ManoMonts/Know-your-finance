import type { CategoryTotal, FinancialInsight, MonthlyFlow, Summary, Transaction } from '../types/finance';

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

export function getFinancialInsights(transactions: Transaction[]): FinancialInsight[] {
  const summary = getSummary(transactions);
  const categories = getExpensesByCategory(transactions);
  const expenses = transactions.filter((transaction) => transaction.type === 'expense');
  const incomes = transactions.filter((transaction) => transaction.type === 'income');

  if (transactions.length === 0) {
    return [
      {
        title: 'Comece importando seu extrato',
        description: 'Assim que houver lançamentos, o Know Your Finance cria uma leitura automática do seu mês.',
        tone: 'neutral',
      },
    ];
  }

  const insights: FinancialInsight[] = [];
  const expenseRatio = summary.income > 0 ? summary.expense / summary.income : 0;
  const mainCategory = categories[0];
  const biggestExpense = expenses.reduce<Transaction | null>((biggest, transaction) => {
    if (!biggest) return transaction;
    return transaction.amount > biggest.amount ? transaction : biggest;
  }, null);

  if (summary.balance >= 0) {
    insights.push({
      title: 'Saldo positivo no período',
      description: 'As entradas cobriram os gastos analisados. Esse é um bom ponto para criar meta de reserva.',
      tone: 'positive',
      value: formatCurrency(summary.balance),
    });
  } else {
    insights.push({
      title: 'Gastos acima das entradas',
      description: 'O período fechou negativo. Vale olhar primeiro para os maiores gastos e categorias recorrentes.',
      tone: 'warning',
      value: formatCurrency(Math.abs(summary.balance)),
    });
  }

  if (summary.income > 0) {
    insights.push({
      title: expenseRatio > 0.85 ? 'Comprometimento alto da renda' : 'Renda ainda com folga',
      description:
        expenseRatio > 0.85
          ? 'Os gastos consumiram uma parte muito alta das entradas. Uma revisão por categoria pode liberar caixa rapidamente.'
          : 'Os gastos ficaram abaixo de 85% das entradas no extrato analisado.',
      tone: expenseRatio > 0.85 ? 'warning' : 'positive',
      value: `${Math.round(expenseRatio * 100)}%`,
    });
  }

  if (mainCategory) {
    const categoryShare = summary.expense > 0 ? mainCategory.value / summary.expense : 0;
    insights.push({
      title: `Maior peso: ${mainCategory.name}`,
      description: `Essa categoria representa ${Math.round(categoryShare * 100)}% dos gastos analisados.`,
      tone: categoryShare > 0.4 ? 'warning' : 'neutral',
      value: formatCurrency(mainCategory.value),
    });
  }

  if (biggestExpense) {
    insights.push({
      title: 'Maior lançamento de gasto',
      description: biggestExpense.description,
      tone: 'neutral',
      value: formatCurrency(biggestExpense.amount),
    });
  }

  if (incomes.length === 0 && expenses.length > 0) {
    insights.push({
      title: 'Só encontrei gastos no extrato',
      description: 'Para uma análise mais fiel, importe também o período com as entradas da conta.',
      tone: 'warning',
    });
  }

  return insights.slice(0, 4);
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
