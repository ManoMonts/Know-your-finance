import { expenseRules, incomeRules } from './financeRules';
import type { CategoryRule, Transaction, TransactionType } from '../types/finance';

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getSeparator(line: string) {
  if (line.includes(';')) return ';';
  if (line.includes('\t')) return '\t';
  return ',';
}

function normalizeDate(rawDate: string) {
  const value = rawDate.trim();
  const brDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) return value;

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const compactDate = value.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactDate) return `${compactDate[1]}/${compactDate[2]}/${compactDate[3]}`;

  return value;
}

export function parseAmount(raw: string) {
  const value = raw.trim();
  const isNegativeByParentheses = /^\(.*\)$/.test(value);
  const isNegativeByText = /(^-|\bD\b|DEBITO|DÉBITO|SAIDA|SAÍDA)/i.test(value);
  const isPositiveByText = /(\bC\b|CREDITO|CRÉDITO|ENTRADA)/i.test(value);

  const numericOnly = value
    .replace(/[()]/g, '')
    .replace(/R\$/gi, '')
    .replace(/[^\d,.-]/g, '')
    .trim();

  if (!numericOnly) return 0;

  const lastComma = numericOnly.lastIndexOf(',');
  const lastDot = numericOnly.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : '.';

  let normalized = numericOnly;
  if (decimalSeparator === ',') {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;

  const absoluteValue = Math.abs(parsed);
  if (isNegativeByParentheses || isNegativeByText || parsed < 0) return -absoluteValue;
  if (isPositiveByText) return absoluteValue;
  return parsed;
}

export function categorize(description: string, type: TransactionType) {
  const normalized = normalizeText(description);
  const rules: CategoryRule[] = type === 'income' ? incomeRules : expenseRules;
  const match = rules.find((rule) => rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword))));
  return match?.category ?? (type === 'income' ? 'Outras entradas' : 'Outros gastos');
}

function parseDelimitedLine(line: string, index: number): Transaction | null {
  const separator = getSeparator(line);
  const parts = line.split(separator).map((part) => part.trim()).filter(Boolean);

  if (parts.length < 3) return null;

  const [rawDate, ...middleParts] = parts;
  const amountRaw = middleParts.pop() ?? '0';
  const amount = parseAmount(amountRaw);

  if (amount === 0) return null;

  const description = middleParts.join(' ').trim() || 'Lançamento sem descrição';
  const type: TransactionType = amount >= 0 ? 'income' : 'expense';

  return {
    id: `${index}-${rawDate}-${description}-${amount}`,
    date: normalizeDate(rawDate),
    description,
    amount: Math.abs(amount),
    type,
    category: categorize(description, type),
    source: line,
  };
}

function parseLooseLine(line: string, index: number): Transaction | null {
  const amountMatch = line.match(/\(?-?\s?R?\$?\s?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\)?|\(?-?\s?\d+[.,]\d{2}\)?/i);
  if (!amountMatch) return null;

  const amountRaw = amountMatch[0];
  const amount = parseAmount(amountRaw);
  if (amount === 0) return null;

  const dateMatch = line.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{2}\d{2}\d{4}/);
  const rawDate = dateMatch?.[0] ?? 'Sem data';
  const description = line
    .replace(amountRaw, '')
    .replace(rawDate, '')
    .replace(/[;|,\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Lançamento sem descrição';

  const type: TransactionType = amount >= 0 ? 'income' : 'expense';

  return {
    id: `${index}-${rawDate}-${description}-${amount}`,
    date: normalizeDate(rawDate),
    description,
    amount: Math.abs(amount),
    type,
    category: categorize(description, type),
    source: line,
  };
}

export function parseStatement(text: string): Transaction[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseDelimitedLine(line, index) ?? parseLooseLine(line, index))
    .filter((transaction): transaction is Transaction => Boolean(transaction));
}
