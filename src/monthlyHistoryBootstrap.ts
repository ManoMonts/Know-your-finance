import { formatCurrency, getExpensesByCategory, getSummary } from './lib/financeAnalytics';
import { parseStatement } from './lib/statementParser';
import type { Transaction } from './types/finance';

type PeriodOption = 'all' | 'last3' | string;

let selectedPeriod: PeriodOption = 'all';
let renderScheduled = false;
let lastSignature = '';

function getRawStatementText() {
  return document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Cole o extrato bancário aqui"]')?.value ?? '';
}

function parseMonthKey(date: string) {
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function getAvailableMonths(transactions: Transaction[]) {
  return Array.from(new Set(transactions.map((transaction) => parseMonthKey(transaction.date)).filter((value): value is string => Boolean(value))))
    .sort((a, b) => b.localeCompare(a));
}

function getSelectedMonthKeys(months: string[]) {
  if (selectedPeriod === 'all') return months;
  if (selectedPeriod === 'last3') return months.slice(0, 3);
  return months.includes(selectedPeriod) ? [selectedPeriod] : months;
}

function filterByPeriod(transactions: Transaction[], months: string[]) {
  const selectedMonths = new Set(getSelectedMonthKeys(months));
  return transactions.filter((transaction) => {
    const key = parseMonthKey(transaction.date);
    return key ? selectedMonths.has(key) : selectedPeriod === 'all';
  });
}

function buildMonthlyRows(transactions: Transaction[], months: string[]) {
  return months.map((month) => {
    const monthTransactions = transactions.filter((transaction) => parseMonthKey(transaction.date) === month);
    const summary = getSummary(monthTransactions);
    return { month, summary };
  });
}

function createPanel() {
  const panel = document.createElement('section');
  panel.className = 'panel wide-panel monthly-history-panel';
  panel.innerHTML = '<div class="empty-state compact-empty">Carregando histórico financeiro...</div>';
  return panel;
}

function ensurePanel() {
  const auditPanel = document.querySelector<HTMLElement>('.audit-panel');
  const insightPanel = document.querySelector<HTMLElement>('.insight-panel');
  if (!auditPanel && !insightPanel) return null;

  let panel = document.querySelector<HTMLElement>('.monthly-history-panel');
  if (!panel) {
    panel = createPanel();
    const anchor = insightPanel ?? auditPanel;
    anchor?.insertAdjacentElement('beforebegin', panel);
  }

  return panel;
}

function renderMonthlyHistory() {
  const panel = ensurePanel();
  if (!panel) return;

  const transactions = parseStatement(getRawStatementText());
  const months = getAvailableMonths(transactions);

  if (months.length === 0 || transactions.length === 0) {
    selectedPeriod = 'all';
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="section-label">Histórico financeiro</span>
          <h2>Meses analisados</h2>
        </div>
      </div>
      <div class="empty-state compact-empty">Importe ou abra análises salvas para visualizar o comparativo por mês.</div>
    `;
    return;
  }

  if (selectedPeriod !== 'all' && selectedPeriod !== 'last3' && !months.includes(selectedPeriod)) {
    selectedPeriod = 'all';
  }

  const selectedTransactions = filterByPeriod(transactions, months);
  const selectedSummary = getSummary(selectedTransactions);
  const categoryHighlights = getExpensesByCategory(selectedTransactions).slice(0, 4);
  const monthlyRows = buildMonthlyRows(transactions, months);
  const selectedLabel = selectedPeriod === 'all'
    ? 'Todos os meses'
    : selectedPeriod === 'last3'
      ? 'Últimos 3 meses'
      : monthLabel(selectedPeriod);

  const signature = JSON.stringify({
    selectedPeriod,
    months,
    count: transactions.length,
    income: selectedSummary.income,
    expense: selectedSummary.expense,
    balance: selectedSummary.balance,
  });

  if (signature === lastSignature && panel.querySelector('.monthly-history-content')) return;
  lastSignature = signature;

  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <span class="section-label">Histórico financeiro</span>
        <h2>Comparativo por mês</h2>
        <p class="muted">Escolha um mês específico, os últimos 3 meses ou todos os meses carregados.</p>
      </div>
      <div class="filter-field" style="min-width:220px">
        <span class="filter-label">Período</span>
        <select class="monthly-period-select" aria-label="Selecionar período financeiro">
          <option value="all" ${selectedPeriod === 'all' ? 'selected' : ''}>Todos os meses</option>
          ${months.length >= 2 ? `<option value="last3" ${selectedPeriod === 'last3' ? 'selected' : ''}>Últimos 3 meses</option>` : ''}
          ${months.map((month) => `<option value="${month}" ${selectedPeriod === month ? 'selected' : ''}>${capitalize(monthLabel(month))}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="monthly-history-content">
      <div class="grid metrics" style="margin-top:16px">
        <div class="metric-card positive">
          <span>Período selecionado</span>
          <strong style="font-size:1.15rem">${escapeHtml(capitalize(selectedLabel))}</strong>
        </div>
        <div class="metric-card">
          <span>Entradas</span>
          <strong>${formatCurrency(selectedSummary.income)}</strong>
        </div>
        <div class="metric-card">
          <span>Gastos</span>
          <strong>${formatCurrency(selectedSummary.expense)}</strong>
        </div>
        <div class="metric-card ${selectedSummary.balance >= 0 ? 'positive' : ''}">
          <span>Saldo</span>
          <strong>${formatCurrency(selectedSummary.balance)}</strong>
        </div>
      </div>

      <div class="content-grid" style="margin-top:16px">
        <div class="panel" style="box-shadow:none;background:rgba(2,6,23,.28)">
          <div class="panel-header">
            <div>
              <span class="section-label">Resumo mensal</span>
              <h2>Meses carregados</h2>
            </div>
          </div>
          <div class="merchant-list">
            ${monthlyRows.map((row) => `
              <div class="merchant-row">
                <div class="merchant-main">
                  <strong>${escapeHtml(capitalize(monthLabel(row.month)))}</strong>
                  <span>${row.summary.count} lançamento(s)</span>
                </div>
                <div class="merchant-value" style="display:grid;gap:4px;text-align:right">
                  <span style="color:#86efac">${formatCurrency(row.summary.income)}</span>
                  <span style="color:#fca5a5">-${formatCurrency(row.summary.expense)}</span>
                  <strong>${formatCurrency(row.summary.balance)}</strong>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="panel" style="box-shadow:none;background:rgba(2,6,23,.28)">
          <div class="panel-header">
            <div>
              <span class="section-label">Categorias do período</span>
              <h2>Onde mais saiu dinheiro</h2>
            </div>
          </div>
          ${categoryHighlights.length > 0 ? `
            <div class="category-list">
              ${categoryHighlights.map((category) => `
                <div>
                  <span>${escapeHtml(category.name)}</span>
                  <strong>${formatCurrency(category.value)}</strong>
                </div>
              `).join('')}
            </div>
          ` : '<div class="empty-state compact-empty">Nenhum gasto identificado nesse período.</div>'}
        </div>
      </div>
    </div>
  `;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  window.requestAnimationFrame(() => {
    renderScheduled = false;
    renderMonthlyHistory();
  });
}

const observer = new MutationObserver(() => {
  if (!document.querySelector('.monthly-history-panel')) scheduleRender();
});
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('change', (event) => {
  const target = event.target as HTMLSelectElement | null;
  if (target?.classList.contains('monthly-period-select')) {
    selectedPeriod = target.value;
    lastSignature = '';
    scheduleRender();
    return;
  }

  if (target?.matches('textarea[aria-label="Cole o extrato bancário aqui"]')) {
    selectedPeriod = 'all';
    lastSignature = '';
    scheduleRender();
  }
});

document.addEventListener('input', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.matches('textarea[aria-label="Cole o extrato bancário aqui"]')) {
    selectedPeriod = 'all';
    lastSignature = '';
    scheduleRender();
  }
});

window.addEventListener('kyf:load-statement', () => {
  selectedPeriod = 'all';
  lastSignature = '';
  window.setTimeout(scheduleRender, 250);
});

scheduleRender();
