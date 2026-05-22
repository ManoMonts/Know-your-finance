import { supabase } from './supabase';
import type { Summary, Transaction } from '../types/finance';

function parseBrazilianDate(date: string) {
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function getStatementTitle(transactions: Transaction[]) {
  const firstDate = transactions.find((transaction) => transaction.date !== 'Sem data')?.date;
  if (!firstDate) return 'Análise financeira';

  const [, month, year] = firstDate.split('/');
  return `Análise ${month}/${year}`;
}

export async function saveAnalysis(summary: Summary, transactions: Transaction[], originalFileName?: string) {
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Faça login para salvar esta análise.');

  const { data: statement, error: statementError } = await supabase
    .from('bank_statements')
    .insert({
      user_id: userData.user.id,
      title: getStatementTitle(transactions),
      original_file_name: originalFileName ?? null,
      total_income: summary.income,
      total_expense: summary.expense,
      balance: summary.balance,
    })
    .select('id')
    .single();

  if (statementError) throw statementError;

  const payload = transactions.map((transaction) => ({
    statement_id: statement.id,
    user_id: userData.user.id,
    transaction_date: parseBrazilianDate(transaction.date),
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type,
    category_name: transaction.category,
    raw_line: transaction.source,
  }));

  if (payload.length > 0) {
    const { error: transactionsError } = await supabase.from('transactions').insert(payload);
    if (transactionsError) throw transactionsError;
  }

  return statement.id as string;
}
