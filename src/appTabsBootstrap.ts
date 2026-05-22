let activeTab: 'analysis' | 'planning' = 'analysis';
let renderScheduled = false;

function ensureTabs() {
  const topbar = document.querySelector<HTMLElement>('.app-topbar');
  if (!topbar) return null;

  let tabs = document.querySelector<HTMLElement>('.app-tabs-shell');
  if (!tabs) {
    tabs = document.createElement('section');
    tabs.className = 'app-tabs-shell';
    tabs.innerHTML = `
      <div class="app-tabs-card">
        <button type="button" class="app-tab-button active" data-app-tab="analysis">Análise</button>
        <button type="button" class="app-tab-button" data-app-tab="planning">Planejamento</button>
      </div>
    `;
    topbar.insertAdjacentElement('afterend', tabs);
  }

  return tabs;
}

function ensurePlanningRoute() {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  const tabs = document.querySelector<HTMLElement>('.app-tabs-shell');
  if (!shell || !tabs) return null;

  let route = document.querySelector<HTMLElement>('.planning-route');
  if (!route) {
    route = document.createElement('section');
    route.className = 'planning-route';
    route.innerHTML = `
      <div class="planning-route-hero panel wide-panel">
        <div>
          <span class="section-label">Planejamento</span>
          <h1>Planeje metas, gastos e ganhos futuros.</h1>
          <p class="muted">Crie simulações livres sem alterar a análise real do extrato. Cada meta usa a fonte de cálculo escolhida por você.</p>
        </div>
      </div>
    `;
    tabs.insertAdjacentElement('afterend', route);
  }

  return route;
}

function getAnalysisElements() {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  if (!shell) return [] as HTMLElement[];

  return Array.from(shell.children).filter((child): child is HTMLElement => {
    if (!(child instanceof HTMLElement)) return false;
    if (child.classList.contains('app-topbar')) return false;
    if (child.classList.contains('app-tabs-shell')) return false;
    if (child.classList.contains('planning-route')) return false;
    return true;
  });
}

function applyActiveTab() {
  const tabs = ensureTabs();
  const planningRoute = ensurePlanningRoute();
  if (!tabs || !planningRoute) return;

  tabs.querySelectorAll<HTMLButtonElement>('[data-app-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.appTab === activeTab);
  });

  getAnalysisElements().forEach((element) => {
    element.classList.toggle('tab-hidden', activeTab !== 'analysis');
  });

  planningRoute.classList.toggle('tab-hidden', activeTab !== 'planning');
  window.dispatchEvent(new CustomEvent('kyf:active-tab-change', { detail: { activeTab } }));
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  window.requestAnimationFrame(() => {
    renderScheduled = false;
    applyActiveTab();
  });
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('[data-app-tab]');
  if (!button?.dataset.appTab) return;

  activeTab = button.dataset.appTab === 'planning' ? 'planning' : 'analysis';
  applyActiveTab();

  const topbar = document.querySelector<HTMLElement>('.app-topbar');
  topbar?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const observer = new MutationObserver(() => {
  if (document.querySelector('.app-shell')) scheduleRender();
});
observer.observe(document.body, { childList: true, subtree: true });

scheduleRender();
