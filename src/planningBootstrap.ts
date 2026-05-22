import { formatCurrency, getSummary } from './lib/financeAnalytics';
import { parseStatement } from './lib/statementParser';
import type { Transaction } from './types/finance';

type GoalSource = 'real-average' | 'manual-monthly' | 'planned-balance';
type PlannedItemType = 'income' | 'expense';

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyAmount: number;
  source: GoalSource;
};

type PlannedItem = {
  id: string;
  type: PlannedItemType;
  name: string;
  amount: number;
  recurrence: 'single' | 'monthly';
  includeInProjection: boolean;
};

type PlanningState = {
  goals: Goal[];
  plannedItems: PlannedItem[];
  customMonthlyBalance: number;
};

const storageKey = 'kyf-planning-v1';
let renderScheduled = false;
let lastSignature = '';

const defaultState: PlanningState = {
  customMonthlyBalance: 1000,
  goals: [
    {
      id: createId(),
      name: 'Reserva financeira',
      targetAmount: 5000,
      currentAmount: 0,
      monthlyAmount: 1000,
      source: 'manual-monthly',
    },
  ],
  plannedItems: [],
};

function createId() {
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState(): PlanningState {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return defaultState;
    const parsed = JSON.parse(saved) as Partial<PlanningState>;
    return {
      customMonthlyBalance: Number(parsed.customMonthlyBalance ?? defaultState.customMonthlyBalance),
      goals: Array.isArray(parsed.goals) ? parsed.goals.map(normalizeGoal) : defaultState.goals,
      plannedItems: Array.isArray(parsed.plannedItems) ? parsed.plannedItems.map(normalizePlannedItem) : [],
    };
  } catch {
    return defaultState;
  }
}

function saveState(state: PlanningState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function normalizeGoal(goal: Partial<Goal>): Goal {
  return {
    id: goal.id || createId(),
    name: goal.name || 'Nova meta',
    targetAmount: Number(goal.targetAmount ?? 0),
    currentAmount: Number(goal.currentAmount ?? 0),
    monthlyAmount: Number(goal.monthlyAmount ?? 0),
    source: goal.source === 'real-average' || goal.source === 'planned-balance' || goal.source === 'manual-monthly' ? goal.source : 'manual-monthly',
  };
}

function normalizePlannedItem(item: Partial<PlannedItem>): PlannedItem {
  return {
    id: item.id || createId(),
    type: item.type === 'income' ? 'income' : 'expense',
    name: item.name || 'Item planejado',
    amount: Number(item.amount ?? 0),
    recurrence: item.recurrence === 'single' ? 'single' : 'monthly',
    includeInProjection: item.includeInProjection !== false,
  };
}

function getRawStatementText() {
  return document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Cole o extrato bancário aqui"]')?.value ?? '';
}

function parseMonthKey(date: string) {
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}`;
}

function getRealMonthlyAverage(transactions: Transaction[]) {
  const monthKeys = Array.from(new Set(transactions.map((transaction) => parseMonthKey(transaction.date)).filter((value): value is string => Boolean(value))));
  if (monthKeys.length === 0) return 0;

  const totalBalance = monthKeys.reduce((sum, monthKey) => {
    const monthTransactions = transactions.filter((transaction) => parseMonthKey(transaction.date) === monthKey);
    return sum + getSummary(monthTransactions).balance;
  }, 0);

  return totalBalance / monthKeys.length;
}

function getPlannedMonthlyBalance(state: PlanningState) {
  return state.plannedItems.reduce((sum, item) => {
    if (!item.includeInProjection || item.recurrence !== 'monthly') return sum;
    return item.type === 'income' ? sum + item.amount : sum - item.amount;
  }, 0);
}

function getMonthlyValueForGoal(goal: Goal, state: PlanningState, realAverage: number) {
  if (goal.source === 'real-average') return realAverage;
  if (goal.source === 'planned-balance') return getPlannedMonthlyBalance(state);
  return goal.monthlyAmount;
}

function getGoalProjection(goal: Goal, state: PlanningState, realAverage: number) {
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const monthlyValue = getMonthlyValueForGoal(goal, state, realAverage);

  if (remaining <= 0) {
    return { remaining, monthlyValue, months: 0, label: 'Meta concluída' };
  }

  if (monthlyValue <= 0) {
    return { remaining, monthlyValue, months: null, label: 'Sem valor mensal suficiente' };
  }

  const months = Math.ceil(remaining / monthlyValue);
  const finishDate = new Date();
  finishDate.setMonth(finishDate.getMonth() + months);

  return {
    remaining,
    monthlyValue,
    months,
    label: `${months} ${months === 1 ? 'mês' : 'meses'} • previsão: ${finishDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
  };
}

function ensurePanel() {
  const route = document.querySelector<HTMLElement>('.planning-route');
  if (!route) return null;

  let panel = route.querySelector<HTMLElement>('.planning-panel');
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'panel wide-panel planning-panel';
    route.appendChild(panel);
  }

  return panel;
}

function renderPlanningPanel() {
  const panel = ensurePanel();
  if (!panel) return;

  const state = loadState();
  const transactions = parseStatement(getRawStatementText());
  const summary = getSummary(transactions);
  const realAverage = getRealMonthlyAverage(transactions);
  const plannedMonthlyBalance = getPlannedMonthlyBalance(state);

  const signature = JSON.stringify({ state, count: transactions.length, balance: summary.balance, realAverage, plannedMonthlyBalance });
  if (signature === lastSignature && panel.innerHTML.trim()) return;
  lastSignature = signature;

  panel.innerHTML = `
    <div class="panel-header planning-header">
      <div>
        <span class="section-label">Planejamento futuro</span>
        <h2>Metas, ganhos e gastos planejados</h2>
        <p class="muted">Monte cenários do seu jeito. O cálculo usa somente a fonte que você escolher em cada meta.</p>
      </div>
      <button type="button" class="planning-add-goal">Nova meta</button>
    </div>

    <div class="planning-grid">
      <article class="planning-summary-card">
        <span>Média real detectada</span>
        <strong>${formatCurrency(realAverage)}</strong>
        <small>Calculada pelos meses carregados no extrato/histórico.</small>
      </article>
      <article class="planning-summary-card">
        <span>Saldo planejado mensal</span>
        <strong>${formatCurrency(plannedMonthlyBalance)}</strong>
        <small>Ganhos futuros mensais menos gastos futuros mensais incluídos.</small>
      </article>
      <article class="planning-summary-card">
        <span>Lançamentos usados</span>
        <strong>${transactions.length}</strong>
        <small>Base atual da análise carregada no app.</small>
      </article>
    </div>

    <div class="planning-layout">
      <section class="planning-block">
        <div class="planning-block-header">
          <div>
            <span class="section-label">Minhas metas</span>
            <h3>Simulação por objetivo</h3>
          </div>
        </div>
        <div class="planning-goals-list">
          ${state.goals.map((goal) => renderGoal(goal, state, realAverage)).join('')}
        </div>
      </section>

      <section class="planning-block">
        <div class="planning-block-header">
          <div>
            <span class="section-label">Futuro planejado</span>
            <h3>Ganhos e gastos futuros</h3>
          </div>
          <div class="planning-inline-actions">
            <button type="button" class="planning-add-income">+ Ganho</button>
            <button type="button" class="planning-add-expense">+ Gasto</button>
          </div>
        </div>
        <div class="planning-items-list">
          ${state.plannedItems.length > 0 ? state.plannedItems.map(renderPlannedItem).join('') : '<div class="empty-state compact-empty">Nenhum ganho ou gasto futuro cadastrado.</div>'}
        </div>
      </section>
    </div>
  `;
}

function renderGoal(goal: Goal, state: PlanningState, realAverage: number) {
  const projection = getGoalProjection(goal, state, realAverage);
  const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;

  return `
    <article class="planning-goal-card" data-goal-id="${goal.id}">
      <div class="planning-form-grid">
        <label>
          <span>Nome da meta</span>
          <input data-goal-field="name" value="${escapeHtml(goal.name)}" />
        </label>
        <label>
          <span>Fonte do cálculo</span>
          <select data-goal-field="source">
            <option value="manual-monthly" ${goal.source === 'manual-monthly' ? 'selected' : ''}>Valor manual por mês</option>
            <option value="real-average" ${goal.source === 'real-average' ? 'selected' : ''}>Média real dos extratos</option>
            <option value="planned-balance" ${goal.source === 'planned-balance' ? 'selected' : ''}>Ganhos/gastos planejados</option>
          </select>
        </label>
        <label>
          <span>Valor alvo</span>
          <input data-goal-field="targetAmount" inputmode="decimal" value="${goal.targetAmount}" />
        </label>
        <label>
          <span>Valor atual</span>
          <input data-goal-field="currentAmount" inputmode="decimal" value="${goal.currentAmount}" />
        </label>
        <label>
          <span>Valor mensal manual</span>
          <input data-goal-field="monthlyAmount" inputmode="decimal" value="${goal.monthlyAmount}" />
        </label>
      </div>
      <div class="planning-result-row">
        <div>
          <span>Falta</span>
          <strong>${formatCurrency(projection.remaining)}</strong>
        </div>
        <div>
          <span>Valor usado no cálculo</span>
          <strong>${formatCurrency(projection.monthlyValue)}</strong>
        </div>
        <div>
          <span>Previsão</span>
          <strong>${escapeHtml(projection.label)}</strong>
        </div>
      </div>
      <div class="planning-progress"><span style="width:${progress}%"></span></div>
      <div class="planning-card-actions">
        <button type="button" class="planning-delete-goal">Excluir meta</button>
      </div>
    </article>
  `;
}

function renderPlannedItem(item: PlannedItem) {
  return `
    <article class="planning-item-card" data-planned-item-id="${item.id}">
      <div class="planning-form-grid compact">
        <label>
          <span>Tipo</span>
          <select data-item-field="type">
            <option value="income" ${item.type === 'income' ? 'selected' : ''}>Ganho futuro</option>
            <option value="expense" ${item.type === 'expense' ? 'selected' : ''}>Gasto futuro</option>
          </select>
        </label>
        <label>
          <span>Descrição</span>
          <input data-item-field="name" value="${escapeHtml(item.name)}" />
        </label>
        <label>
          <span>Valor</span>
          <input data-item-field="amount" inputmode="decimal" value="${item.amount}" />
        </label>
        <label>
          <span>Recorrência</span>
          <select data-item-field="recurrence">
            <option value="monthly" ${item.recurrence === 'monthly' ? 'selected' : ''}>Mensal</option>
            <option value="single" ${item.recurrence === 'single' ? 'selected' : ''}>Único</option>
          </select>
        </label>
        <label class="planning-checkbox-label">
          <span>Incluir?</span>
          <input data-item-field="includeInProjection" type="checkbox" ${item.includeInProjection ? 'checked' : ''} />
        </label>
      </div>
      <div class="planning-card-actions">
        <button type="button" class="planning-delete-item">Excluir item</button>
      </div>
    </article>
  `;
}

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function updateGoal(goalId: string, field: keyof Goal, value: string) {
  const state = loadState();
  state.goals = state.goals.map((goal) => {
    if (goal.id !== goalId) return goal;
    if (field === 'name') return { ...goal, name: value };
    if (field === 'source') return { ...goal, source: value as GoalSource };
    return { ...goal, [field]: parseNumber(value) };
  });
  saveState(state);
  lastSignature = '';
  scheduleRender();
}

function updatePlannedItem(itemId: string, field: keyof PlannedItem, element: HTMLInputElement | HTMLSelectElement) {
  const state = loadState();
  state.plannedItems = state.plannedItems.map((item) => {
    if (item.id !== itemId) return item;
    if (field === 'includeInProjection') return { ...item, includeInProjection: (element as HTMLInputElement).checked };
    if (field === 'amount') return { ...item, amount: parseNumber(element.value) };
    return { ...item, [field]: element.value } as PlannedItem;
  });
  saveState(state);
  lastSignature = '';
  scheduleRender();
}

function addGoal() {
  const state = loadState();
  state.goals.unshift({
    id: createId(),
    name: 'Nova meta',
    targetAmount: 1000,
    currentAmount: 0,
    monthlyAmount: 250,
    source: 'manual-monthly',
  });
  saveState(state);
  lastSignature = '';
  scheduleRender();
}

function addPlannedItem(type: PlannedItemType) {
  const state = loadState();
  state.plannedItems.unshift({
    id: createId(),
    type,
    name: type === 'income' ? 'Novo ganho futuro' : 'Novo gasto futuro',
    amount: 0,
    recurrence: 'monthly',
    includeInProjection: true,
  });
  saveState(state);
  lastSignature = '';
  scheduleRender();
}

function deleteGoal(goalId: string) {
  const state = loadState();
  state.goals = state.goals.filter((goal) => goal.id !== goalId);
  saveState(state);
  lastSignature = '';
  scheduleRender();
}

function deletePlannedItem(itemId: string) {
  const state = loadState();
  state.plannedItems = state.plannedItems.filter((item) => item.id !== itemId);
  saveState(state);
  lastSignature = '';
  scheduleRender();
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
    renderPlanningPanel();
  });
}

const observer = new MutationObserver(() => {
  if (document.querySelector('.planning-route')) scheduleRender();
});
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) return;

  const goalCard = target.closest<HTMLElement>('[data-goal-id]');
  const goalField = target.dataset.goalField as keyof Goal | undefined;
  if (goalCard?.dataset.goalId && goalField) {
    updateGoal(goalCard.dataset.goalId, goalField, target.value);
    return;
  }

  const itemCard = target.closest<HTMLElement>('[data-planned-item-id]');
  const itemField = target.dataset.itemField as keyof PlannedItem | undefined;
  if (itemCard?.dataset.plannedItemId && itemField) {
    updatePlannedItem(itemCard.dataset.plannedItemId, itemField, target);
    return;
  }

  if (target.matches('textarea[aria-label="Cole o extrato bancário aqui"]')) {
    lastSignature = '';
    scheduleRender();
  }
});

document.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement | null;
  if (!target) return;

  const goalCard = target.closest<HTMLElement>('[data-goal-id]');
  const goalField = target.getAttribute('data-goal-field') as keyof Goal | null;
  if (goalCard?.dataset.goalId && goalField) {
    updateGoal(goalCard.dataset.goalId, goalField, target.value);
    return;
  }

  const itemCard = target.closest<HTMLElement>('[data-planned-item-id]');
  const itemField = target.getAttribute('data-item-field') as keyof PlannedItem | null;
  if (itemCard?.dataset.plannedItemId && itemField) {
    updatePlannedItem(itemCard.dataset.plannedItemId, itemField, target);
  }
});

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  if (target.closest('.planning-add-goal')) {
    addGoal();
    return;
  }

  if (target.closest('.planning-add-income')) {
    addPlannedItem('income');
    return;
  }

  if (target.closest('.planning-add-expense')) {
    addPlannedItem('expense');
    return;
  }

  const goalCard = target.closest<HTMLElement>('[data-goal-id]');
  if (goalCard?.dataset.goalId && target.closest('.planning-delete-goal')) {
    deleteGoal(goalCard.dataset.goalId);
    return;
  }

  const itemCard = target.closest<HTMLElement>('[data-planned-item-id]');
  if (itemCard?.dataset.plannedItemId && target.closest('.planning-delete-item')) {
    deletePlannedItem(itemCard.dataset.plannedItemId);
  }
});

window.addEventListener('kyf:load-statement', () => {
  lastSignature = '';
  window.setTimeout(scheduleRender, 250);
});

window.addEventListener('kyf:active-tab-change', () => {
  lastSignature = '';
  scheduleRender();
});

scheduleRender();
