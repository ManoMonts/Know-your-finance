import { expenseRules, incomeRules } from './financeRules';
import type { CategoryRule, Transaction, TransactionType } from '../types/finance';

const monthMap: Record<string, string> = {
  JAN: '01',
  FEV: '02',
  MAR: '03',
  ABR: '04',
  MAI: '05',
  JUN: '06',
  JUL: '07',
  AGO: '08',
  SET: '09',
  OUT: '10',
  NOV: '11',
  DEZ: '12',
};

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
  const value = rawDate.trim().toUpperCase();
  const brDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) return value;

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const compactDate = value.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactDate) return `${compactDate[1]}/${compactDate[2]}/${compactDate[3]}`;

  const nubankDate = value.match(/^(\d{2})\s+([A-ZÇ]{3})\s+(\d{4})$/);
  if (nubankDate) {
    const month = monthMap[nubankDate[2]] ?? '01';
    return `${nubankDate[1]}/${month}/${nubankDate[3]}`;
  }

  return rawDate.trim();
}

export function parseAmount(raw: string) {
  const value = raw.trim();
  const isNegativeByParentheses = /^\(.*\)$/.test(value);
  const isNegativeByText = /(^-|\bD\b|DEBITO|DÉBITO|SAIDA|SAÍDA)/i.test(value);
  const isPositiveByText = /(\+|\bC\b|CREDITO|CRÉDITO|ENTRADA)/i.test(value);

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

function shouldIgnoreLine(line: string) {
  const normalized = normalizeText(line);

  if (!normalized) return true;

  return [
    'felipe monteiro',
    'cpf',
    'agencia',
    'conta:',
    'valores em r$',
    'saldo final do periodo',
    'saldo final do período',
    'saldo inicial',
    'rendimento liquido',
    'rendimento líquido',
    'movimentacoes',
    'movimentações',
    'tem alguma duvida',
    'tem alguma dúvida',
    'caso a solucao',
    'caso a solução',
    'extrato gerado',
    'nubank.com.br',
    'nao nos responsabilizamos',
    'não nos responsabilizamos',
    'asseguramos a autenticidade',
    'nu financeira',
    'nu pagamentos',
    'cnpj',
  ].some((term) => normalized.includes(normalizeText(term)));
}

function parseModeFromLine(line: string): TransactionType | null {
  if (/Total de entradas/i.test(line)) return 'income';
  if (/Total de saídas|Total de saidas/i.test(line)) return 'expense';
  return null;
}

function isDateLine(line: string) {
  return /^\d{2}\s+[A-ZÇ]{3}\s+\d{4}\b/i.test(line.trim());
}

function isTransactionStarter(line: string) {
  return /^(Compra no débito|Transferência enviada pelo Pix|Transferência recebida pelo Pix|Transferência Recebida|Reembolso recebido pelo Pix|Pagamento de fatura|Pagamento de|Pix enviado|Pix recebido)/i.test(line.trim());
}

function isContinuationNoise(line: string) {
  return /^(Agência|Conta:|\d{1,20}-?\d?$|[A-Z0-9 .-]+\(\d{4}\)$)/i.test(line.trim());
}

function getAmountFromFollowingLines(lines: string[], startIndex: number) {
  for (let index = startIndex + 1; index <= Math.min(startIndex + 8, lines.length - 1); index += 1) {
    const line = lines[index].trim();

    if (/^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+[,.]\d{2}$/.test(line)) {
      return { amountRaw: line, endIndex: index };
    }

    if (isDateLine(line) || /^Total de /i.test(line) || isTransactionStarter(line)) break;
  }

  return null;
}

function buildMultiLineDescription(lines: string[], startIndex: number) {
  const parts = [lines[startIndex].trim()];
  let endIndex = startIndex;
  let amountRaw: string | null = null;

  const inlineMatch = parts[0].match(/^(.*?)(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[,.]\d{2})$/);
  if (inlineMatch) {
    return {
      description: inlineMatch[1].replace(/\s+/g, ' ').trim(),
      amountRaw: inlineMatch[2],
      endIndex,
    };
  }

  for (let index = startIndex + 1; index <= Math.min(startIndex + 8, lines.length - 1); index += 1) {
    const line = lines[index].trim();

    if (/^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+[,.]\d{2}$/.test(line)) {
      amountRaw = line;
      endIndex = index;
      break;
    }

    if (isDateLine(line) || /^Total de /i.test(line) || isTransactionStarter(line)) break;

    if (!shouldIgnoreLine(line) && !isContinuationNoise(line)) {
      parts.push(line);
    }

    endIndex = index;
  }

  if (!amountRaw) {
    const delayed = getAmountFromFollowingLines(lines, startIndex);
    if (delayed) {
      amountRaw = delayed.amountRaw;
      endIndex = delayed.endIndex;
    }
  }

  return {
    description: parts.join(' ').replace(/\s+/g, ' ').trim(),
    amountRaw,
    endIndex,
  };
}

function parseNubankLines(lines: string[]) {
  const transactions: Transaction[] = [];
  let currentDate = '';
  let currentMode: TransactionType | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index].trim();

    const dateMatch = line.match(/^(\d{2}\s+[A-ZÇ]{3}\s+\d{4})\b/i);
    if (dateMatch) {
      currentDate = normalizeDate(dateMatch[1]);
      line = line.replace(dateMatch[1], '').trim();
      const modeFromDateLine = parseModeFromLine(line);
      if (modeFromDateLine) currentMode = modeFromDateLine;
      if (!line || modeFromDateLine) continue;
    }

    const mode = parseModeFromLine(line);
    if (mode) {
      currentMode = mode;
      continue;
    }

    if (!currentDate || !currentMode || shouldIgnoreLine(line) || !isTransactionStarter(line)) continue;

    const parsed = buildMultiLineDescription(lines, index);
    if (!parsed.amountRaw || !parsed.description) continue;

    const signedAmount = parseAmount(`${currentMode === 'expense' ? '-' : '+'}${parsed.amountRaw}`);
    const type: TransactionType = signedAmount >= 0 ? 'income' : 'expense';
    const description = parsed.description;

    transactions.push({
      id: `nubank-${transactions.length}-${currentDate}-${description}-${signedAmount}`,
      date: currentDate,
      description,
      amount: Math.abs(signedAmount),
      type,
      category: categorize(description, type),
      source: lines.slice(index, parsed.endIndex + 1).join(' '),
    });

    index = parsed.endIndex;
  }

  return transactions;
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
  if (shouldIgnoreLine(line) || /^Total de /i.test(line)) return null;

  const dateMatch = line.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{2}\d{2}\d{4}|\d{2}\s+[A-ZÇ]{3}\s+\d{4}/i);
  const rawDate = dateMatch?.[0] ?? 'Sem data';
  const lineWithoutDate = rawDate === 'Sem data' ? line : line.replace(rawDate, ' ');
  const amountMatches = [...lineWithoutDate.matchAll(/\(?[+-]?\s?R?\$?\s?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\)?|\(?[+-]?\s?\d+[.,]\d{2}\)?/gi)];
  const amountRaw = amountMatches.at(-1)?.[0];

  if (!amountRaw) return null;

  const amount = parseAmount(amountRaw);
  if (amount === 0) return null;

  const description = lineWithoutDate
    .replace(amountRaw, '')
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
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const looksLikeNubank = lines.some((line) => /Total de entradas|Total de saídas|Total de saidas/i.test(line))
    && lines.some((line) => /Compra no débito|Transferência .*Pix|Pagamento de fatura/i.test(line));

  if (looksLikeNubank) {
    return parseNubankLines(lines);
  }

  return lines
    .filter((line) => !shouldIgnoreLine(line))
    .map((line, index) => parseDelimitedLine(line, index) ?? parseLooseLine(line, index))
    .filter((transaction): transaction is Transaction => Boolean(transaction));
}
