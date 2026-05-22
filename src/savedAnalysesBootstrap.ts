import { formatCurrency } from './lib/financeAnalytics';
import { supabase } from './lib/supabase';

type SavedStatement = {
  id: string;
  title: string;
  imported_at: string;
  total_income: number;
  total_expense: number;
  balance: number;
};

type SavedTransaction = {
  transaction_date: string | null;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_name: string;
  raw_line: string | null;
};

let isLoading = false;

function formatDate(date: string | null) {
  if (!date) return 'Sem data';
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return date;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatImportedAt(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function transactionToLine(transaction: SavedTransaction) {
  const amount = transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
  const amountText = amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatDate(transaction.transaction_date)};${transaction.description};${amountText}`;
}

function getTextarea() {
  return document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Cole o extrato bancário aqui"]');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createPanel() {
  const panel = document.createElement('section');
  panel.className = 'panel wide-panel saved-analyses-panel';
  panel.innerHTML = `
    <div class="panel-header saved-analyses-header">
      <div>
        <span class="section-label">Histórico salvo</span>
        <h2>Análises salvas</h2>
      </div>
      <button type="button" class="saved-refresh-button">Atualizar</button>
    </div>
    <div class="saved-analyses-content">
      <div class="empty-state compact-empty">Entre na conta para ver suas análises salvas.</div>
    </div>
  `;
  return panel;
}

function ensurePanel() {
  const hero = document.querySelector<HTMLElement>('.app-shell .hero-card');
  if (!hero) return null;

  let panel = document.querySelector<HTMLElement>('.saved-analyses-panel');
  if (!panel) {
    panel = createPanel();
    hero.insertAdjacentElement('afterend', panel);
  }

  return panel;
}

function setPanelContent(html: string) {
  const panel = ensurePanel();
  const content = panel?.querySelector<HTMLElement>('.saved-analyses-content');
  if (content) content.innerHTML = html;
}

async function loadSavedAnalyses() {
  if (isLoading) return;
  const panel = ensurePanel();
  if (!panel || !supabase) return;

  isLoading = true;
  setPanelContent('<div class="empty-state compact-empty">Carregando análises salvas...</div>');

  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setPanelContent('<div class="empty-state compact-empty">Entre na conta para ver suas análises salvas.</div>');
      return;
    }

    const { data, error } = await supabase
      .from('bank_statements')
      .select('id,title,imported_at,total_income,total_expense,balance')
      .order('imported_at', { ascending: false })
      .limit(8);

    if (error) throw error;

    const statements = (data ?? []) as SavedStatement[];

    if (statements.length === 0) {
      setPanelContent('<div class="empty-state compact-empty">Nenhuma análise salva ainda. Importe um extrato e clique em “Salvar análise”.</div>');
      return;
    }

    setPanelContent(`
      <div class="saved-list">
        ${statements
          .map((statement) => `
            <article class="saved-card" data-statement-id="${statement.id}">
              <div class="saved-card-main">
                <strong>${escapeHtml(statement.title)}</strong>
                <span>Salva em ${formatImportedAt(statement.imported_at)}</span>
              </div>
              <div class="saved-card-values">
                <span>Entradas <strong>${formatCurrency(Number(statement.total_income))}</strong></span>
                <span>Gastos <strong>${formatCurrency(Number(statement.total_expense))}</strong></span>
                <span>Saldo <strong>${formatCurrency(Number(statement.balance))}</strong></span>
              </div>
              <div class="saved-card-actions">
                <button type="button" class="saved-open-button" data-open-statement="${statement.id}">Abrir</button>
                <button type="button" class="saved-delete-button" data-delete-statement="${statement.id}">Excluir</button>
              </div>
            </article>
          `)
          .join('')}
      </div>
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar as análises salvas.';
    setPanelContent(`<div class="empty-state compact-empty">${escapeHtml(message)}</div>`);
  } finally {
    isLoading = false;
  }
}

async function openSavedAnalysis(statementId: string) {
  if (!supabase) return;

  setPanelContent('<div class="empty-state compact-empty">Abrindo análise salva...</div>');

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date,description,amount,type,category_name,raw_line')
      .eq('statement_id', statementId)
      .order('transaction_date', { ascending: true });

    if (error) throw error;

    const transactions = (data ?? []) as SavedTransaction[];
    const textarea = getTextarea();

    if (!textarea) {
      await loadSavedAnalyses();
      return;
    }

    textarea.value = transactions.map(transactionToLine).join('\n');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await loadSavedAnalyses();

    document.getElementById('analise')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível abrir a análise salva.';
    setPanelContent(`<div class="empty-state compact-empty">${escapeHtml(message)}</div>`);
  }
}

async function deleteSavedAnalysis(statementId: string) {
  if (!supabase) return;
  const confirmed = window.confirm('Excluir esta análise salva? Essa ação não pode ser desfeita.');
  if (!confirmed) return;

  const { error } = await supabase.from('bank_statements').delete().eq('id', statementId);
  if (error) {
    setPanelContent(`<div class="empty-state compact-empty">${escapeHtml(error.message)}</div>`);
    return;
  }

  await loadSavedAnalyses();
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('.saved-refresh-button')) {
      void loadSavedAnalyses();
      return;
    }

    const openButton = target.closest<HTMLElement>('[data-open-statement]');
    if (openButton?.dataset.openStatement) {
      void openSavedAnalysis(openButton.dataset.openStatement);
      return;
    }

    const deleteButton = target.closest<HTMLElement>('[data-delete-statement]');
    if (deleteButton?.dataset.deleteStatement) {
      void deleteSavedAnalysis(deleteButton.dataset.deleteStatement);
    }
  });
}

function schedulePanelLoad() {
  window.requestAnimationFrame(() => {
    if (ensurePanel()) void loadSavedAnalyses();
  });
}

const observer = new MutationObserver(() => schedulePanelLoad());
observer.observe(document.body, { childList: true, subtree: true });

if (supabase) {
  supabase.auth.onAuthStateChange(() => schedulePanelLoad());
}

bindEvents();
schedulePanelLoad();
