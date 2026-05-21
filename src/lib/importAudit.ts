import { getSummary } from './financeAnalytics';
import { parseAmount } from './statementParser';
import type { ImportAudit, Transaction } from '../types/finance';

function findAmountAfterLabel(text: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedLabel}\\s*([+-]?\\s?R?\\$?\\s?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|[+-]?\\s?\\d+[,.]\\d{2})`, 'i');
  const match = text.match(pattern);
  return match?.[1] ? Math.abs(parseAmount(match[1])) : null;
}

function detectBankName(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes('nu pagamentos') || normalized.includes('nubank')) return 'Nubank';
  if (normalized.includes('itaú') || normalized.includes('itau')) return 'Itaú';
  if (normalized.includes('bradesco')) return 'Bradesco';
  if (normalized.includes('santander')) return 'Santander';
  if (normalized.includes('banco do brasil')) return 'Banco do Brasil';
  if (normalized.includes('caixa economica') || normalized.includes('caixa econômica')) return 'Caixa';
  return 'Banco não identificado';
}

function detectPeriod(text: string) {
  const match = text.match(/(\d{2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4})\s+a\s+(\d{2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4})/i);
  if (!match) return 'Período não identificado';
  return `${match[1]} a ${match[2]}`.toUpperCase();
}

function moneyDifference(declared: number | null, detected: number) {
  if (declared === null) return null;
  return Number((detected - declared).toFixed(2));
}

function isClose(value: number | null, tolerance = 0.05) {
  if (value === null) return true;
  return Math.abs(value) <= tolerance;
}

export function auditImport(rawText: string, transactions: Transaction[]): ImportAudit {
  const summary = getSummary(transactions);
  const declaredIncome = findAmountAfterLabel(rawText, 'Total de entradas');
  const declaredExpense = findAmountAfterLabel(rawText, 'Total de saídas') ?? findAmountAfterLabel(rawText, 'Total de saidas');
  const declaredFinalBalance = findAmountAfterLabel(rawText, 'Saldo final do período') ?? findAmountAfterLabel(rawText, 'Saldo final do periodo');
  const incomeDifference = moneyDifference(declaredIncome, summary.income);
  const expenseDifference = moneyDifference(declaredExpense, summary.expense);
  const hasDeclaredTotals = declaredIncome !== null || declaredExpense !== null;
  const status = !hasDeclaredTotals
    ? 'unknown'
    : isClose(incomeDifference) && isClose(expenseDifference)
      ? 'matched'
      : 'warning';

  return {
    bankName: detectBankName(rawText),
    period: detectPeriod(rawText),
    declaredIncome,
    declaredExpense,
    declaredFinalBalance,
    detectedIncome: summary.income,
    detectedExpense: summary.expense,
    detectedBalance: summary.balance,
    detectedTransactions: summary.count,
    incomeDifference,
    expenseDifference,
    status,
  };
}
