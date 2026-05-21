create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  original_file_name text,
  imported_at timestamptz not null default now(),
  total_income numeric(14,2) not null default 0,
  total_expense numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_date date,
  description text not null,
  amount numeric(14,2) not null,
  type text not null check (type in ('income', 'expense')),
  category_id uuid references public.categories(id) on delete set null,
  category_name text not null,
  raw_line text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.bank_statements enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can view own statements"
  on public.bank_statements for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own statements"
  on public.bank_statements for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own statements"
  on public.bank_statements for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own statements"
  on public.bank_statements for delete
  using ((select auth.uid()) = user_id);

create policy "Users can view own categories"
  on public.categories for select
  using ((select auth.uid()) = user_id or user_id is null);

create policy "Users can manage own categories"
  on public.categories for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can view own transactions"
  on public.transactions for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists transactions_statement_idx on public.transactions(statement_id);
create index if not exists transactions_category_idx on public.transactions(category_name);
