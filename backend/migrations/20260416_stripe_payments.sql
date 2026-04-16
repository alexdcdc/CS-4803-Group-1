alter table public.profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_connect_status text not null default 'not_started',
  add column if not exists stripe_connect_requirements_due text[] not null default '{}';

create table if not exists public.stripe_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text unique,
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'created' check (status in ('created', 'paid', 'expired')),
  transaction_id uuid references public.transactions(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamp with time zone not null default now()
);

create table if not exists public.creator_payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  credits integer not null check (credits >= 100),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  stripe_account_id text not null,
  stripe_transfer_id text unique,
  status text not null default 'pending' check (status in ('pending', 'transferred', 'failed')),
  transaction_id uuid references public.transactions(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.stripe_checkout_sessions enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.creator_payouts enable row level security;

create index if not exists stripe_checkout_sessions_user_id_idx
  on public.stripe_checkout_sessions(user_id);
create index if not exists creator_payouts_creator_id_idx
  on public.creator_payouts(creator_id);
create index if not exists creator_payouts_status_idx
  on public.creator_payouts(status);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_checkout_sessions'
      and policyname = 'Users can read own checkout sessions'
  ) then
    create policy "Users can read own checkout sessions"
      on public.stripe_checkout_sessions
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'creator_payouts'
      and policyname = 'Users can read own creator payouts'
  ) then
    create policy "Users can read own creator payouts"
      on public.creator_payouts
      for select
      to authenticated
      using ((select auth.uid()) = creator_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_webhook_events'
      and policyname = 'No client access to webhook events'
  ) then
    create policy "No client access to webhook events"
      on public.stripe_webhook_events
      for all
      to authenticated
      using (false)
      with check (false);
  end if;
end $$;
