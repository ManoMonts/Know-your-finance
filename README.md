# Know Your Finance

**Know Your Finance** é um site de análise financeira pessoal criado para transformar extratos bancários em uma visão mais clara, organizada e fácil de entender.

A proposta é simples: a pessoa importa ou cola um extrato bancário, e o sistema tenta separar automaticamente entradas, gastos, categorias, maiores destinos do dinheiro, maiores fontes de entrada e alguns insights sobre o período analisado.

O objetivo do projeto não é substituir um contador, consultor financeiro ou aplicativo bancário oficial. A ideia é ser uma ferramenta prática para ajudar o usuário a enxergar melhor o próprio comportamento financeiro.

---

## O que o app consegue analisar

Na versão atual, o Know Your Finance já trabalha com:

- Importação de extratos em PDF, CSV ou TXT.
- Leitura de texto colado manualmente.
- Separação entre entradas e gastos.
- Categorização automática inicial por palavras-chave.
- Total de entradas no período.
- Total de gastos no período.
- Saldo analisado.
- Quantidade de lançamentos encontrados.
- Gastos por categoria.
- Entradas x gastos por mês.
- Maiores destinos de gastos.
- Maiores fontes de entrada.
- Lista de transações categorizadas.
- Busca e filtros por descrição, categoria, tipo e valor.
- Login com Supabase Auth.
- Salvamento de análises no Supabase.
- Histórico de análises salvas para reabrir depois.

---

## Exemplos de perguntas que o app ajuda a responder

- Quanto entrou e quanto saiu no período?
- Em qual categoria eu mais gastei?
- Qual foi meu maior gasto individual?
- Para onde meu dinheiro mais foi?
- De onde veio a maior parte das entradas?
- Meu mês fechou positivo ou negativo?
- Existem gastos concentrados em poucos lugares?
- Quais transações foram identificadas como alimentação, transporte, saúde, impostos, transferências etc.?

---

## Segurança e privacidade

O projeto foi pensado com cuidado, mas é importante ser transparente: esta ainda é uma aplicação em desenvolvimento.

O que já existe de segurança:

- Autenticação com Supabase Auth.
- Confirmação de e-mail configurável pelo Supabase.
- Banco com Row Level Security ativado.
- Policies para que cada usuário acesse somente os próprios dados.
- Uso de chave pública/publishable key no front-end, sem service role exposta.
- Funções sensíveis do banco com execução pública bloqueada.
- Rate limits configuráveis no painel do Supabase.

O que o app **não deve prometer ainda**:

- Não garante leitura perfeita de todos os extratos bancários.
- Não deve ser usado como única fonte para decisão financeira importante.
- Não substitui conferência manual dos dados.
- Não substitui orientação profissional financeira, contábil ou jurídica.

Recomendação: antes de confiar totalmente no relatório, o usuário deve comparar os totais apresentados pelo app com os totais oficiais do extrato bancário.

---

## Sobre os dados importados

A leitura do extrato acontece no navegador e o sistema tenta transformar as linhas do arquivo em transações organizadas.

Quando o usuário está logado e clica em **Salvar análise**, as informações processadas podem ser salvas no Supabase para permitir histórico e reabertura posterior.

Nesta fase, o foco é salvar a análise financeira processada, não criar um cofre definitivo de documentos bancários.

---

## Stack utilizada

- React
- TypeScript
- Vite
- Supabase
- Recharts
- Lucide React
- PDF.js
- Vercel

---

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois abra o endereço exibido pelo Vite, normalmente:

```bash
http://localhost:5173
```

---

## Variáveis de ambiente

Crie um arquivo `.env.local` seguindo o `.env.example`:

```bash
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
```

Na Vercel, essas mesmas variáveis precisam estar configuradas no projeto correto para o login funcionar em produção.

---

## Formatos de extrato

O app tenta trabalhar com arquivos PDF, CSV, TXT e texto colado manualmente.

Um formato simples aceito é:

```txt
01/05/2026;PIX RECEBIDO CLIENTE;2500,00
02/05/2026;MERCADO MUFFATO;-286,43
03/05/2026;UBER VIAGEM;-32,90
```

Valores positivos são tratados como entrada. Valores negativos são tratados como gasto.

Também existem ajustes iniciais para extratos reais de bancos brasileiros, mas a compatibilidade ainda deve ser evoluída conforme novos modelos de extrato forem testados.

---

## Próximas melhorias planejadas

- Melhorar o parser para mais bancos brasileiros.
- Permitir edição manual de categoria por transação.
- Criar relatórios mensais comparativos.
- Criar metas financeiras.
- Adicionar alertas de gasto.
- Melhorar histórico de análises.
- Criar tela de perfil do usuário.
- Adicionar exclusão completa de dados pelo usuário.
- Criar página de termos de uso e política de privacidade.
- Evoluir a segurança antes de qualquer uso público amplo.

---

## Status do projeto

O Know Your Finance está em desenvolvimento ativo.

A versão atual já permite testar a ideia principal: importar um extrato, organizar os lançamentos e visualizar uma análise financeira inicial. Ainda assim, a aplicação deve ser tratada como uma versão beta, sujeita a erros de leitura, categorização e interpretação dos dados.
