import { getSummary } from './financeAnalytics';
import { normalizeText, parseAmount } from './statementParser';
import type { ImportAudit, Transaction } from '../types/finance';

function isMoneyLine(line: string) {
  return /^[+-]?\s?R?\$?\s?\d{1,3}(?:\.\d{3})*,\d{2}$|^[+-]?\s?\d+[,.]\d{2}$/.test(line.trim());
}

function findInlineAmountAfterLabel(text: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedLabel}\\s*([+-]?\\s?R?\\$?\\s?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|[+-]?\\s?\\d+[,.]\\d{2})`, 'i');
  const match = text.match(pattern);
  return match?.[1] ? Math.abs(parseAmount(match[1])) : null;
}

function findAmountInNubankSummary(lines: string[], label: string) {
  const normalizedLabel = normalizeText(label);
  const summaryStart = lines.findIndex((line) => normalizeText(line).includes('saldo inicial'));
  const summaryEnd = lines.findIndex((line) => normalizeText(line).includes('movimentacoes') || normalizeText(line).includes('movimentações'));
  const safeStart = summaryStart >= 0 ? summaryStart : 0;
  const safeEnd = summaryEnd > safeStart ? summaryEnd : Math.min(lines.length, safeStart + 20);
  const summaryLines = lines.slice(safeStart, safeEnd);
  const labelIndex = summaryLines.findIndex((line) => normalizeText(line).includes(normalizedLabel));

  if (labelIndex < 0) return null;

  const followingMoney = summaryLines.slice(labelIndex + 1).find((line) => isMoneyLine(line));
  return followingMoney ? Math.abs(parseAmount(followingMoney)) : null;
}

function findAmountAfterLabel(rawText: string, lines: string[], label: string) {
  return findInlineAmountAfterLabel(rawText, label) ?? findAmountInNubankSummary(lines, label);
}

function detectBankName(text: string) {
  const normalized = normalizeText(text);
  if (normalized.includes('nu pagamentos') || normalized.includes('nubank')) return 'Nubank';
  if (normalized.includes('itau')) return 'Itaú';
  if (normalized.includes('bradesco')) return 'Bradesco';
  if (normalized.includes('santander')) return 'Santander';
  if (normalized.includes('banco do brasil')) return 'Banco do Brasil';
  if (normalized.includes('caixa economica')) return 'Caixa';
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
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const summary = getSummary(transactions);
  const declaredIncome = findAmountAfterLabel(rawText, lines, 'Total de entradas');
  const declaredExpense = findAmountAfterLabel(rawText, lines, 'Total de saídas') ?? findAmountAfterLabel(rawText, lines, 'Total de saidas');
  const declaredFinalBalance = findAmountAfterLabel(rawText, lines, 'Saldo final do período') ?? findAmountAfterLabel(rawText, lines, 'Saldo final do periodo');
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
