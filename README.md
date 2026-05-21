# Know Your Finance

Site para análise financeira pessoal a partir de extratos bancários.

## O que já existe nesta primeira versão

- Importação de extrato por arquivo `.csv` ou `.txt`.
- Campo para colar o extrato manualmente.
- Separação automática entre entradas e gastos.
- Categorização inicial por palavras-chave.
- Cards com entradas, gastos, saldo e quantidade de lançamentos.
- Gráfico de gastos por categoria.
- Gráfico de entradas x gastos por mês.
- Tabela pesquisável de transações categorizadas.
- Estrutura pronta para Supabase com autenticação, RLS e tabelas financeiras.

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois abra o endereço exibido pelo Vite, normalmente:

```bash
http://localhost:5173
```

## Formato de extrato aceito agora

Nesta primeira etapa, o parser aceita linhas no padrão:

```txt
01/05/2026;PIX RECEBIDO CLIENTE;2500,00
02/05/2026;MERCADO MUFFATO;-286,43
03/05/2026;UBER VIAGEM;-32,90
```

Valores positivos são tratados como entrada. Valores negativos são tratados como gasto.

## Supabase

A pasta `supabase/migrations` já possui o schema inicial com:

- `profiles`
- `bank_statements`
- `categories`
- `transactions`
- Row Level Security ativado
- Policies para cada usuário acessar somente seus próprios dados

Crie um arquivo `.env.local` seguindo o `.env.example`:

```bash
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
```

## Próximas etapas recomendadas

1. Criar login/cadastro com Supabase Auth.
2. Salvar extratos importados no banco.
3. Permitir edição manual de categoria por transação.
4. Melhorar o parser para extratos reais de bancos brasileiros.
5. Criar uma tela de histórico de importações.
6. Criar relatórios mensais com comparativo entre períodos.
7. Adicionar metas financeiras e alertas de gasto.
