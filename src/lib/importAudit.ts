import { getSummary } from './financeAnalytics';
import { normalizeText, parseAmount } from './statementParser';
import type { ImportAudit, Transaction } from '../types/finance';

type SummaryLabelKey = 'initialBalance' | 'netYield' | 'income' | 'expense' | 'finalBalance';

type SummaryLabel = {
  key: SummaryLabelKey;
  aliases: string[];
};

const summaryLabels: SummaryLabel[] = [
  { key: 'initialBalance', aliases: ['Saldo inicial'] },
  { key: 'netYield', aliases: ['Rendimento líquido', 'Rendimento liquido'] },
  { key: 'income', aliases: ['Total de entradas'] },
  { key: 'expense', aliases: ['Total de saídas', 'Total de saidas'] },
  { key: 'finalBalance', aliases: ['Saldo final do período', 'Saldo final do periodo'] },
];

function isMoneyLine(line: string) {
  return /^[+-]?\s?R?\$?\s?\d{1,3}(?:\.\d{3})*,\d{2}$|^[+-]?\s?\d+[,.]\d{2}$/.test(line.trim());
}

function findInlineAmountAfterLabel(text: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedLabel}\\s*([+-]?\\s?R?\\$?\\s?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|[+-]?\\s?\\d+[,.]\\d{2})`, 'i');
  const match = text.match(pattern);
  return match?.[1] ? Math.abs(parseAmount(match[1])) : null;
}

function getSummaryBlock(lines: string[]) {
  const summaryStart = lines.findIndex((line) => normalizeText(line).includes('saldo inicial'));
  const summaryEnd = lines.findIndex((line) => normalizeText(line).includes('movimentacoes'));
  const safeStart = summaryStart >= 0 ? summaryStart : 0;
  const safeEnd = summaryEnd > safeStart ? summaryEnd : Math.min(lines.length, safeStart + 30);
  return lines.slice(safeStart, safeEnd);
}

function getLabelKey(line: string): SummaryLabelKey | null {
  const normalized = normalizeText(line);
  const label = summaryLabels.find((item) => item.aliases.some((alias) => normalized.includes(normalizeText(alias))));
  return label?.key ?? null;
}

function mapNubankSummaryValues(lines: string[]) {
  const summaryLines = getSummaryBlock(lines);
  const labels = summaryLines
    .map((line, index) => ({ key: getLabelKey(line), index }))
    .filter((item): item is { key: SummaryLabelKey; index: number } => Boolean(item.key));
  const values = summaryLines
    .map((line, index) => ({ value: isMoneyLine(line) ? Math.abs(parseAmount(line)) : null, index }))
    .filter((item): item is { value: number; index: number } => item.value !== null);

  const mapped = new Map<SummaryLabelKey, number>();

  labels.forEach((label, labelPosition) => {
    const nextLabel = labels[labelPosition + 1];
    const inlineValue = values.find((value) => value.index > label.index && (!nextLabel || value.index < nextLabel.index));

    if (inlineValue) {
      mapped.set(label.key, inlineValue.value);
      return;
    }

    const blockValue = values[labelPosition];
    if (blockValue) mapped.set(label.key, blockValue.value);
  });

  return mapped;
}

function findAmountAfterLabel(rawText: string, lines: string[], labels: string[], key: SummaryLabelKey) {
  for (const label of labels) {
    const inlineAmount = findInlineAmountAfterLabel(rawText, label);
    if (inlineAmount !== null) return inlineAmount;
  }

  return mapNubankSummaryValues(lines).get(key) ?? null;
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
  const declaredIncome = findAmountAfterLabel(rawText, lines, ['Total de entradas'], 'income');
  const declaredExpense = findAmountAfterLabel(rawText, lines, ['Total de saídas', 'Total de saidas'], 'expense');
  const declaredFinalBalance = findAmountAfterLabel(rawText, lines, ['Saldo final do período', 'Saldo final do periodo'], 'finalBalance');
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
