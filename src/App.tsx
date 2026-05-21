import { type ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Info,
  Lightbulb,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Upload,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getExpensesByCategory, getFinancialInsights, getMonthlyFlow, getSummary, getTopMerchants, formatCurrency } from './lib/financeAnalytics';
import { sampleText } from './lib/financeRules';
import { auditImport } from './lib/importAudit';
import { extractTextFromPdf } from './lib/pdfExtractor';
import { normalizeText, parseStatement } from './lib/statementParser';
import type { FinancialInsight, ImportAudit, Transaction, TransactionType } from './types/finance';

const chartColors = ['#60a5fa', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#14b8a6', '#f97316', '#ec4899', '#84cc16'];
type SortOption = 'date-desc' | 'amount-desc' | 'amount-asc' | 'expenses-desc' | 'income-desc';
type TypeFilter = 'all' | TransactionType;
type QuickFilter = 'biggest-expenses' | 'income' | 'pix' | 'food' | 'transport' | 'health';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [rawText, setRawText] = useState(sampleText);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [isImporting, setIsImporting] = useState(false);

  const transactions = useMemo(() => parseStatement(rawText), [rawText]);
  const summary = useMemo(() => getSummary(transactions), [transactions]);
  const importAudit = useMemo(() => auditImport(rawText, transactions), [rawText, transactions]);
  const expensesByCategory = useMemo(() => getExpensesByCategory(transactions), [transactions]);
  const topMerchants = useMemo(() => getTopMerchants(transactions), [transactions]);
  const monthlyFlow = useMemo(() => getMonthlyFlow(transactions), [transactions]);
  const insights = useMemo(() => getFinancialInsights(transactions), [transactions]);
  const categories = useMemo(() => Array.from(new Set(transactions.map((item) => item.category))).sort(), [transactions]);

  const filteredTransactions = useMemo(() => {
    const search = normalizeText(query);

    return transactions
      .filter((item) => {
        const matchesSearch = !search || normalizeText(`${item.description} ${item.category} ${item.date}`).includes(search);
        const matchesType = typeFilter === 'all' || item.type === typeFilter;
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => sortTransactions(a, b, sortOption));
  }, [categoryFilter, query, sortOption, transactions, typeFilter]);

  async function handleFile(file?: File) {
    if (!file) return;

    setIsImporting(true);

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const content = isPdf ? await extractTextFromPdf(file) : await file.text();
      setRawText(content);
      clearFilters();
      setHasStarted(true);
    } catch {
      window.alert('Não foi possível ler o arquivo. Tente enviar um PDF, CSV ou TXT exportado pelo banco.');
    } finally {
      setIsImporting(false);
    }
  }

  function applyQuickFilter(filter: QuickFilter) {
    setQuery('');
    setCategoryFilter('all');

    if (filter === 'biggest-expenses') {
      setTypeFilter('expense');
      setSortOption('expenses-desc');
      return;
    }

    if (filter === 'income') {
      setTypeFilter('income');
      setSortOption('income-desc');
      return;
    }

    setTypeFilter('all');
    setSortOption(filter === 'pix' ? 'amount-desc' : 'expenses-desc');

    if (filter === 'pix') setQuery('pix');
    if (filter === 'food') setCategoryFilter('Alimentação');
    if (filter === 'transport') setCategoryFilter('Transporte');
    if (filter === 'health') setCategoryFilter('Farmácia e saúde');
  }

  function isQuickFilterActive(filter: QuickFilter) {
    if (filter === 'biggest-expenses') return typeFilter === 'expense' && sortOption === 'expenses-desc' && categoryFilter === 'all' && query === '';
    if (filter === 'income') return typeFilter === 'income' && sortOption === 'income-desc' && categoryFilter === 'all' && query === '';
    if (filter === 'pix') return query === 'pix';
    if (filter === 'food') return categoryFilter === 'Alimentação';
    if (filter === 'transport') return categoryFilter === 'Transporte';
    if (filter === 'health') return categoryFilter === 'Farmácia e saúde';
    return false;
  }

  function clearFilters() {
    setQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSortOption('date-desc');
  }

  if (!hasStarted) {
    return (
      <main className="landing-shell">
        <nav className="landing-nav">
          <div className="landing-brand">
            <span><Wallet size={20} /></span>
            <strong>Know Your Finance</strong>
          </div>
          <button type="button" className="login-preview-button">
            <LockKeyhole size={16} /> Entrar / criar conta em breve
          </button>
        </nav>

        <section className="landing-hero">
          <div className="landing-copy">
            <span className="landing-eyebrow"><Sparkles size={16} /> Análise financeira sem cara de banco chato</span>
            <h1>Entenda seu dinheiro a partir do seu extrato bancário.</h1>
            <p>
              Importe um PDF, CSV ou TXT do banco e veja entradas, gastos, categorias, maiores despesas e insights automáticos em poucos segundos.
            </p>
            <div className="landing-actions">
              <button type="button" className="landing-primary" onClick={() => setHasStarted(true)}>
                Começar análise
              </button>
              <label className={`landing-secondary ${isImporting ? 'loading' : ''}`}>
                {isImporting ? <Loader2 size={18} className="spin" /> : <Upload size={18} />} Importar extrato agora
                <input type="file" accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain" onChange={(event) => handleFile(event.target.files?.[0])} hidden />
              </label>
            </div>
          </div>

          <div className="landing-preview-card">
            <div className="preview-topline">
              <span>Prévia do relatório</span>
              <strong>Demo visual</strong>
            </div>
            <div className="preview-balance">
              <span>Saldo analisado</span>
              <strong>R$ 0,00</strong>
            </div>
            <div className="preview-bars">
              <div><span></span></div>
              <div><span></span></div>
              <div><span></span></div>
            </div>
            <div className="preview-list">
              <div><span>Alimentação</span><strong>categoria</strong></div>
              <div><span>Pix/transferências</span><strong>filtro</strong></div>
              <div><span>Maiores gastos</span><strong>ranking</strong></div>
            </div>
          </div>
        </section>

        <section className="landing-features">
          <article>
            <BarChart3 size={22} />
            <strong>Relatórios claros</strong>
            <p>Entradas, saídas, categorias, gráficos e ranking dos maiores gastos.</p>
          </article>
          <article>
            <ShieldCheck size={22} />
            <strong>Privacidade primeiro</strong>
            <p>Nesta fase, a leitura acontece no navegador. Depois entraremos com login e banco seguro.</p>
          </article>
          <article>
            <TrendingUp size={22} />
            <strong>Insights automáticos</strong>
            <p>O app destaca onde o dinheiro mais saiu e se o mês fechou positivo ou negativo.</p>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <span className="eyebrow"><Sparkles size={16} /> Know Your Finance</span>
          <h1>Transforme seu extrato bancário em uma análise financeira clara.</h1>
          <p>
            Cole ou envie um extrato em PDF, CSV ou texto. O sistema separa entradas e saídas, classifica os gastos e mostra onde seu dinheiro está indo.
          </p>
          <div className="hero-actions">
            <label className={`primary-button ${isImporting ? 'loading' : ''}`}>
              {isImporting ? <Loader2 size={18} className="spin" /> : <Upload size={18} />} {isImporting ? 'Lendo extrato...' : 'Importar extrato'}
              <input type="file" accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain" onChange={(event) => handleFile(event.target.files?.[0])} hidden />
            </label>
            <a className="secondary-button" href="#analise">Ver análise</a>
          </div>
        </div>
        <div className="trust-card">
          <ShieldCheck size={28} />
          <strong>Privacidade primeiro</strong>
          <span>Nesta primeira versão, a análise acontece no navegador. Depois ligamos ao Supabase com login e RLS.</span>
        </div>
      </section>

      <section className="grid metrics" id="analise">
        <MetricCard icon={<ArrowUpCircle />} label="Entradas" value={formatCurrency(summary.income)} />
        <MetricCard icon={<ArrowDownCircle />} label="Gastos" value={formatCurrency(summary.expense)} />
        <MetricCard icon={<Wallet />} label="Saldo analisado" value={formatCurrency(summary.balance)} highlight={summary.balance >= 0} />
        <MetricCard icon={<FileText />} label="Lançamentos" value={String(summary.count)} />
      </section>

      <ImportAuditPanel audit={importAudit} />

      <section className="panel wide-panel insight-panel">
        <div className="panel-header">
          <div>
            <span className="section-label"><Lightbulb size={16} /> Leitura inteligente</span>
            <h2>O que o extrato está dizendo</h2>
          </div>
        </div>
        <div className="insight-grid">
          {insights.map((insight) => (
            <InsightCard key={`${insight.title}-${insight.value ?? ''}`} insight={insight} />
          ))}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel import-panel">
          <div className="panel-header">
            <div>
              <span className="section-label"><Banknote size={16} /> Importação</span>
              <h2>Extrato bancário</h2>
            </div>
          </div>
          <p className="muted">Aceita PDF do banco, CSV, TXT ou texto colado. O parser ignora cabeçalhos, rodapés e totais diários quando possível.</p>
          <textarea
            aria-label="Cole o extrato bancário aqui"
            placeholder="Importe um PDF, CSV ou TXT para começar a análise."
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <span className="section-label"><BarChart3 size={16} /> Categorias</span>
              <h2>Gastos por categoria</h2>
            </div>
          </div>

          {expensesByCategory.length > 0 ? (
            <>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={expensesByCategory} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="category-list">
                {expensesByCategory.map((item) => (
                  <div key={item.name}>
                    <span>{item.name}</span>
                    <strong>{formatCurrency(item.value)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState text="Nenhum gasto identificado no extrato colado." />
          )}
        </div>
      </section>

      <section className="panel wide-panel merchant-panel">
        <div className="panel-header">
          <div>
            <span className="section-label"><Store size={16} /> Maiores destinos</span>
            <h2>Onde o dinheiro mais saiu</h2>
          </div>
        </div>
        {topMerchants.length > 0 ? (
          <div className="merchant-list">
            {topMerchants.map((merchant, index) => (
              <div className="merchant-row" key={`${merchant.name}-${merchant.category}`}>
                <span className="merchant-rank">{index + 1}</span>
                <div className="merchant-main">
                  <strong>{merchant.name}</strong>
                  <span>{merchant.category} • {merchant.count} lançamento(s)</span>
                </div>
                <strong className="merchant-value">{formatCurrency(merchant.value)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Importe um extrato para ver seus maiores destinos de gasto." />
        )}
      </section>

      <section className="panel wide-panel">
        <div className="panel-header">
          <div>
            <span className="section-label"><CalendarDays size={16} /> Fluxo</span>
            <h2>Entradas x gastos por mês</h2>
          </div>
        </div>
        {monthlyFlow.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="entradas" fill="#22c55e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="gastos" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="Cole um extrato para visualizar o fluxo mensal." />
        )}
      </section>

      <section className="panel wide-panel transactions-panel">
        <div className="panel-header table-header">
          <div>
            <span className="section-label"><FileText size={16} /> Lançamentos</span>
            <h2>Transações categorizadas</h2>
          </div>
          <div className="table-count">{filteredTransactions.length} resultado(s)</div>
        </div>
        <div className="transactions-toolbar">
          <div className="quick-filters" aria-label="Filtros rápidos">
            <button type="button" className={isQuickFilterActive('biggest-expenses') ? 'active' : ''} onClick={() => applyQuickFilter('biggest-expenses')}>Maiores gastos</button>
            <button type="button" className={isQuickFilterActive('income') ? 'active' : ''} onClick={() => applyQuickFilter('income')}>Só entradas</button>
            <button type="button" className={isQuickFilterActive('pix') ? 'active' : ''} onClick={() => applyQuickFilter('pix')}>Pix/transferências</button>
            <button type="button" className={isQuickFilterActive('food') ? 'active' : ''} onClick={() => applyQuickFilter('food')}>Alimentação</button>
            <button type="button" className={isQuickFilterActive('transport') ? 'active' : ''} onClick={() => applyQuickFilter('transport')}>Transporte</button>
            <button type="button" className={isQuickFilterActive('health') ? 'active' : ''} onClick={() => applyQuickFilter('health')}>Farmácia</button>
          </div>
          <div className="filter-grid">
            <div className="filter-field search-field">
              <span className="filter-label">Buscar</span>
              <div className="search-box">
                <Search size={17} />
                <input
                  aria-label="Buscar transações"
                  placeholder="Descrição, categoria ou data"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="filter-field">
              <span className="filter-label">Tipo</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}>
                <option value="all">Todos os tipos</option>
                <option value="expense">Somente gastos</option>
                <option value="income">Somente entradas</option>
              </select>
            </div>
            <div className="filter-field">
              <span className="filter-label">Categoria</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <span className="filter-label">Ordenação</span>
              <select value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)}>
                <option value="date-desc">Mais recentes primeiro</option>
                <option value="expenses-desc">Maiores gastos primeiro</option>
                <option value="income-desc">Maiores entradas primeiro</option>
                <option value="amount-desc">Maior valor primeiro</option>
                <option value="amount-asc">Menor valor primeiro</option>
              </select>
            </div>
            <button type="button" className="clear-button" onClick={clearFilters}>Limpar</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th className="right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.description}</td>
                  <td><span className="pill">{item.category}</span></td>
                  <td className={item.type === 'income' ? 'income' : 'expense'}>{item.type === 'income' ? 'Entrada' : 'Gasto'}</td>
                  <td className="right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 ? <EmptyState text="Nenhuma transação encontrada." /> : null}
        </div>
      </section>
    </main>
  );
}

function sortTransactions(a: Transaction, b: Transaction, sortOption: SortOption) {
  if (sortOption === 'amount-desc') return b.amount - a.amount;
  if (sortOption === 'amount-asc') return a.amount - b.amount;
  if (sortOption === 'expenses-desc') {
    if (a.type !== b.type) return a.type === 'expense' ? -1 : 1;
    return b.amount - a.amount;
  }
  if (sortOption === 'income-desc') {
    if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
    return b.amount - a.amount;
  }
  return parseDateValue(b.date) - parseDateValue(a.date);
}

function parseDateValue(date: string) {
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return 0;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
}

function ImportAuditPanel({ audit }: { audit: ImportAudit }) {
  const icon = audit.status === 'matched' ? <CheckCircle2 size={18} /> : audit.status === 'warning' ? <AlertTriangle size={18} /> : <Info size={18} />;
  const title = audit.status === 'matched' ? 'Importação conferida' : audit.status === 'warning' ? 'Importação precisa de conferência' : 'Resumo oficial não identificado';
  const description = audit.status === 'matched'
    ? 'Os totais lidos no extrato batem com as transações detectadas.'
    : audit.status === 'warning'
      ? 'O sistema encontrou diferença entre o resumo oficial e as transações lidas. Revise o extrato antes de confiar no relatório.'
      : 'Não encontrei totais oficiais no texto importado. A análise foi feita somente pelas transações detectadas.';

  return (
    <section className={`panel wide-panel audit-panel ${audit.status}`}>
      <div className="audit-header">
        <div className="audit-title">
          {icon}
          <div>
            <span>{title}</span>
            <p>{description}</p>
          </div>
        </div>
        <div className="audit-bank">
          <strong>{audit.bankName}</strong>
          <span>{audit.period}</span>
        </div>
      </div>
      <div className="audit-grid">
        <AuditItem label="Entradas oficiais" value={audit.declaredIncome === null ? 'Não identificado' : formatCurrency(audit.declaredIncome)} />
        <AuditItem label="Entradas lidas" value={formatCurrency(audit.detectedIncome)} difference={audit.incomeDifference} />
        <AuditItem label="Saídas oficiais" value={audit.declaredExpense === null ? 'Não identificado' : formatCurrency(audit.declaredExpense)} />
        <AuditItem label="Saídas lidas" value={formatCurrency(audit.detectedExpense)} difference={audit.expenseDifference} />
        <AuditItem label="Saldo final oficial" value={audit.declaredFinalBalance === null ? 'Não identificado' : formatCurrency(audit.declaredFinalBalance)} />
        <AuditItem label="Transações lidas" value={String(audit.detectedTransactions)} />
      </div>
    </section>
  );
}

function AuditItem({ label, value, difference }: { label: string; value: string; difference?: number | null }) {
  const hasDifference = typeof difference === 'number' && Math.abs(difference) > 0.05;
  return (
    <div className="audit-item">
      <span>{label}</span>
      <strong>{value}</strong>
      {typeof difference === 'number' ? <small className={hasDifference ? 'audit-diff warning' : 'audit-diff'}>{hasDifference ? `Diferença: ${formatCurrency(difference)}` : 'Sem diferença relevante'}</small> : null}
    </div>
  );
}

function MetricCard({ icon, label, value, highlight }: { icon: ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`metric-card ${highlight ? 'positive' : ''}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InsightCard({ insight }: { insight: FinancialInsight }) {
  return (
    <article className={`insight-card ${insight.tone}`}>
      <div>
        <span>{insight.title}</span>
        <p>{insight.description}</p>
      </div>
      {insight.value ? <strong>{insight.value}</strong> : null}
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
