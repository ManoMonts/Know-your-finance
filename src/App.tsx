import { type ReactNode, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  BarChart3,
  CalendarDays,
  FileText,
  Lightbulb,
  Search,
  ShieldCheck,
  Sparkles,
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
import { getExpensesByCategory, getFinancialInsights, getMonthlyFlow, getSummary, formatCurrency } from './lib/financeAnalytics';
import { sampleText } from './lib/financeRules';
import { normalizeText, parseStatement } from './lib/statementParser';
import type { FinancialInsight } from './types/finance';

const chartColors = ['#60a5fa', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#14b8a6', '#f97316', '#ec4899', '#84cc16'];

export default function App() {
  const [rawText, setRawText] = useState(sampleText);
  const [query, setQuery] = useState('');

  const transactions = useMemo(() => parseStatement(rawText), [rawText]);
  const summary = useMemo(() => getSummary(transactions), [transactions]);
  const expensesByCategory = useMemo(() => getExpensesByCategory(transactions), [transactions]);
  const monthlyFlow = useMemo(() => getMonthlyFlow(transactions), [transactions]);
  const insights = useMemo(() => getFinancialInsights(transactions), [transactions]);

  const filteredTransactions = useMemo(() => {
    const search = normalizeText(query);
    if (!search) return transactions;

    return transactions.filter((item) => normalizeText(`${item.description} ${item.category} ${item.date}`).includes(search));
  }, [query, transactions]);

  async function handleFile(file?: File) {
    if (!file) return;

    try {
      const content = await file.text();
      setRawText(content);
    } catch {
      window.alert('Não foi possível ler o arquivo. Tente exportar o extrato em CSV ou TXT.');
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <span className="eyebrow"><Sparkles size={16} /> Know Your Finance</span>
          <h1>Transforme seu extrato bancário em uma análise financeira clara.</h1>
          <p>
            Cole ou envie um extrato em CSV/texto. O sistema separa entradas e saídas, classifica os gastos e mostra onde seu dinheiro está indo.
          </p>
          <div className="hero-actions">
            <label className="primary-button">
              <Upload size={18} /> Importar extrato
              <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => handleFile(event.target.files?.[0])} hidden />
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
          <p className="muted">Formato recomendado: data; descrição; valor. Valores negativos são gastos.</p>
          <textarea
            aria-label="Cole o extrato bancário aqui"
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

      <section className="panel wide-panel">
        <div className="panel-header table-header">
          <div>
            <span className="section-label"><FileText size={16} /> Lançamentos</span>
            <h2>Transações categorizadas</h2>
          </div>
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label="Buscar transações"
              placeholder="Buscar por descrição, categoria ou data"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
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
