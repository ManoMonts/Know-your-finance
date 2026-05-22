import { formatCurrency, getTopIncomeSources } from './lib/financeAnalytics';
import { parseStatement } from './lib/statementParser';

function getRawStatementText() {
  return document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Cole o extrato bancário aqui"]')?.value ?? '';
}

function createIncomePanel() {
  const panel = document.createElement('section');
  panel.className = 'panel wide-panel merchant-panel income-compare-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <span class="section-label income-section-label">Maiores entradas</span>
        <h2>De onde o dinheiro mais entrou</h2>
      </div>
    </div>
    <div class="merchant-list income-compare-list"></div>
  `;
  return panel;
}

function renderIncomePanel(panel: HTMLElement) {
  const list = panel.querySelector<HTMLElement>('.income-compare-list');
  if (!list) return;

  const transactions = parseStatement(getRawStatementText());
  const topIncomeSources = getTopIncomeSources(transactions, 8);

  if (topIncomeSources.length === 0) {
    list.innerHTML = '<div class="empty-state compact-empty">Importe um extrato para ver suas maiores entradas.</div>';
    return;
  }

  list.innerHTML = topIncomeSources
    .map((source, index) => `
      <div class="merchant-row income-row">
        <span class="merchant-rank income-rank">${index + 1}</span>
        <div class="merchant-main">
          <strong>${escapeHtml(source.name)}</strong>
          <span>${escapeHtml(source.category)} • ${source.count} lançamento(s)</span>
        </div>
        <strong class="merchant-value income-value">${formatCurrency(source.value)}</strong>
      </div>
    `)
    .join('');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function ensureIncomeComparePanel() {
  const expensePanel = document.querySelector<HTMLElement>('.merchant-panel:not(.income-compare-panel)');
  if (!expensePanel) return;

  let wrapper = document.querySelector<HTMLElement>('.merchant-comparison-grid');
  let incomePanel = document.querySelector<HTMLElement>('.income-compare-panel');

  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'merchant-comparison-grid';
    expensePanel.parentElement?.insertBefore(wrapper, expensePanel);
    wrapper.appendChild(expensePanel);
  }

  if (!incomePanel) {
    incomePanel = createIncomePanel();
    wrapper.appendChild(incomePanel);
  }

  renderIncomePanel(incomePanel);
}

function scheduleRender() {
  window.requestAnimationFrame(() => ensureIncomeComparePanel());
}

const observer = new MutationObserver(() => scheduleRender());
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('input', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.matches('textarea[aria-label="Cole o extrato bancário aqui"]')) scheduleRender();
});

document.addEventListener('change', (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.matches('textarea[aria-label="Cole o extrato bancário aqui"]')) scheduleRender();
});

scheduleRender();
