-- ============================================================================
-- CHILD SITE — SUPABASE SCHEMA
-- Run this once in your own (fresh) Supabase project: Supabase Dashboard ->
-- SQL Editor -> New query -> paste this whole file -> Run.
--
-- This site never talks to a number/SMS/SMM provider directly — every
-- number/OTP/mail/SMM operation goes through the mother site's public API
-- (see api/_lib/mother.js). This schema only tracks YOUR OWN users, wallets,
-- orders and admin/config data.
-- ============================================================================

-- ── profiles (one row per auth.users row) ──────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  wallet_balance numeric(12,2) not null default 0,
  wallet_hold numeric(12,2) not null default 0,
  referral_balance numeric(12,2) not null default 0,
  referral_earnings numeric(12,2) not null default 0,
  referred_by uuid references public.profiles(id),
  referral_verified boolean not null default false,
  referral_milestone_10_paid boolean not null default false,
  status text not null default 'active' check (status in ('active','blocked')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

-- ── settings (key/value site config — branding, mother API, pricing, etc) ──
create table if not exists public.settings (
  key text primary key,
  value text
);

-- ── numbers (fulfilled via the mother site's /api/v1/request_number etc) ──
create table if not exists public.number_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  service text not null,
  country text not null,
  number text not null,
  operator text,
  server int not null default 1,
  mother_request_id text,
  otp_code text,
  status text not null default 'pending' check (status in ('pending','active','expired','released')),
  cost numeric(12,2) not null,
  hold_amount numeric(12,2) not null,
  expires_at timestamptz,
  requested_at timestamptz not null default now(),
  released_at timestamptz,
  otp_received_at timestamptz
);

create index if not exists idx_number_requests_user on public.number_requests(user_id, requested_at desc);
create index if not exists idx_number_requests_status on public.number_requests(status, expires_at);

-- ── per-service price overrides (falls back to settings.price_per_number) ──
create table if not exists public.service_prices (
  service text primary key,
  price numeric(12,2) not null
);

-- ── temp mailboxes (fulfilled via the mother site's /api/v1/mail/*) ────────
create table if not exists public.mailboxes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  address text not null,
  token text,
  created_at timestamptz not null default now()
);
create index if not exists idx_mailboxes_user on public.mailboxes(user_id, created_at desc);

-- ── wallet transaction ledger ───────────────────────────────────────────
create table if not exists public.transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('credit','debit')),
  amount numeric(12,2) not null,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists idx_transactions_user on public.transactions(user_id, created_at desc);

-- ── wallet top-up requests (screenshot + optional AI verification) ────────
create table if not exists public.payment_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  screenshot_url text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_reply text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists idx_payment_requests_status on public.payment_requests(status, created_at desc);

-- ── withdrawals (from referral_balance only) ───────────────────────────
create table if not exists public.withdrawals (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null,
  account_details text not null,
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  admin_reply text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists idx_withdrawals_user on public.withdrawals(user_id, created_at desc);

-- ── coupons ─────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  id bigint generated always as identity primary key,
  code text unique not null,
  credit_amount numeric(12,2) not null,
  max_uses int not null,
  used_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id bigint generated always as identity primary key,
  coupon_id bigint not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

-- ── SMM: local catalog (your pricing) mapped to the mother site's IDs ─────
create table if not exists public.smm_services (
  id bigint generated always as identity primary key,
  category text not null default 'General',
  title text not null,
  description text,
  icon text,
  price_per_1000 numeric(12,2) not null,
  mother_service_id bigint not null, -- the matching service ID on the mother site
  min_qty int not null,
  max_qty int not null,
  avg_delivery text,
  badge text,
  pinned boolean not null default false,
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.smm_orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_id bigint references public.smm_services(id),
  service_title text not null,
  quantity int not null,
  link text not null,
  price numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','cancelled')),
  mother_order_id text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smm_orders_user on public.smm_orders(user_id, created_at desc);

-- ── announcements (site-wide banner) ───────────────────────────────────
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  message text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── this site's own future public API keys (per-user) ──────────────────
create table if not exists public.api_keys (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  key_hash text unique not null,
  key_prefix text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create table if not exists public.api_key_usage (
  id bigint generated always as identity primary key,
  api_key_id bigint not null references public.api_keys(id) on delete cascade,
  minute_bucket timestamptz not null,
  count int not null default 0,
  unique (api_key_id, minute_bucket)
);

-- ── admin audit log ─────────────────────────────────────────────────────
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id),
  admin_username text,
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_ref_id uuid;
begin
  v_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));

  if new.raw_user_meta_data->>'ref' is not null then
    select id into v_ref_id from public.profiles where username = new.raw_user_meta_data->>'ref';
  end if;

  insert into public.profiles (id, username, email, referred_by)
  values (new.id, v_username, new.email, v_ref_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.ensure_wallet_funds_from_referral(p_user_id uuid, p_needed numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet numeric;
  v_hold numeric;
  v_ref numeric;
  v_available numeric;
  v_shortfall numeric;
  v_move numeric;
begin
  select wallet_balance, wallet_hold, referral_balance into v_wallet, v_hold, v_ref
  from public.profiles where id = p_user_id for update;

  v_available := v_wallet - v_hold;
  if v_available >= p_needed then
    return;
  end if;

  v_shortfall := p_needed - v_available;
  v_move := least(v_shortfall, v_ref);
  if v_move > 0 then
    update public.profiles
    set wallet_balance = wallet_balance + v_move,
        referral_balance = referral_balance - v_move
    where id = p_user_id;
  end if;
end;
$$;

create or replace function public.hold_wallet(p_user_id uuid, p_amount numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available numeric;
begin
  select wallet_balance - wallet_hold into v_available from public.profiles where id = p_user_id for update;
  if v_available is null or v_available < p_amount then
    return false;
  end if;
  update public.profiles set wallet_hold = wallet_hold + p_amount where id = p_user_id;
  return true;
end;
$$;

create or replace function public.release_hold(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set wallet_hold = greatest(wallet_hold - p_amount, 0) where id = p_user_id;
end;
$$;

create or replace function public.finalize_hold(p_user_id uuid, p_amount numeric, p_description text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set wallet_hold = greatest(wallet_hold - p_amount, 0),
      wallet_balance = wallet_balance - p_amount
  where id = p_user_id;

  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'debit', p_amount, p_description);
end;
$$;

create or replace function public.charge_wallet(p_user_id uuid, p_amount numeric, p_description text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available numeric;
begin
  select wallet_balance - wallet_hold into v_available from public.profiles where id = p_user_id for update;
  if v_available is null or v_available < p_amount then
    return false;
  end if;
  update public.profiles set wallet_balance = wallet_balance - p_amount where id = p_user_id;
  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'debit', p_amount, p_description);
  return true;
end;
$$;

create or replace function public.refund_wallet(p_user_id uuid, p_amount numeric, p_description text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set wallet_balance = wallet_balance + p_amount where id = p_user_id;
  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'credit', p_amount, p_description);
end;
$$;

create or replace function public.adjust_wallet(p_user_id uuid, p_amount numeric, p_type text, p_description text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_type = 'credit' then
    update public.profiles set wallet_balance = wallet_balance + p_amount where id = p_user_id;
  else
    update public.profiles set wallet_balance = greatest(wallet_balance - p_amount, 0) where id = p_user_id;
  end if;
  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, p_type, p_amount, p_description);
end;
$$;

create or replace function public.approve_payment(p_payment_id bigint, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_referrer uuid;
  v_already_verified boolean;
  v_first_bonus numeric;
  v_commission_pct numeric;
  v_milestone_count int;
  v_milestone_bonus numeric;
  v_verified_count int;
  v_milestone_paid boolean;
begin
  select * into v_payment from public.payment_requests where id = p_payment_id and status = 'pending' for update;
  if not found then
    raise exception 'Payment not found or already reviewed';
  end if;

  update public.payment_requests
  set status = 'approved', admin_reply = p_reply, reviewed_at = now()
  where id = p_payment_id;

  update public.profiles set wallet_balance = wallet_balance + v_payment.amount where id = v_payment.user_id;
  insert into public.transactions (user_id, type, amount, description)
  values (v_payment.user_id, 'credit', v_payment.amount, 'Wallet top-up approved');

  select referred_by, referral_verified into v_referrer, v_already_verified
  from public.profiles where id = v_payment.user_id;

  if v_referrer is not null and not v_already_verified then
    update public.profiles set referral_verified = true where id = v_payment.user_id;

    select coalesce(value::numeric, 0) into v_first_bonus from public.settings where key = 'referral_first_bonus';
    select coalesce(value::numeric, 0) into v_commission_pct from public.settings where key = 'referral_commission_pct';

    if v_first_bonus > 0 then
      update public.profiles
      set referral_balance = referral_balance + v_first_bonus,
          referral_earnings = referral_earnings + v_first_bonus
      where id = v_referrer;
    end if;

    if v_commission_pct > 0 then
      update public.profiles
      set referral_balance = referral_balance + (v_payment.amount * v_commission_pct / 100),
          referral_earnings = referral_earnings + (v_payment.amount * v_commission_pct / 100)
      where id = v_referrer;
    end if;

    select coalesce(value::int, 0) into v_milestone_count from public.settings where key = 'referral_milestone_count';
    select coalesce(value::numeric, 0) into v_milestone_bonus from public.settings where key = 'referral_milestone_bonus';
    select referral_milestone_10_paid into v_milestone_paid from public.profiles where id = v_referrer;

    if v_milestone_count > 0 and v_milestone_bonus > 0 and not v_milestone_paid then
      select count(*) into v_verified_count from public.profiles where referred_by = v_referrer and referral_verified = true;
      if v_verified_count >= v_milestone_count then
        update public.profiles
        set referral_balance = referral_balance + v_milestone_bonus,
            referral_earnings = referral_earnings + v_milestone_bonus,
            referral_milestone_10_paid = true
        where id = v_referrer;
      end if;
    end if;
  end if;
end;
$$;

create or replace function public.redeem_coupon(p_user_id uuid, p_code text)
returns table(credit_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon record;
begin
  select * into v_coupon from public.coupons where code = p_code and active = true for update;
  if not found then
    raise exception 'Invalid or expired coupon code';
  end if;
  if v_coupon.used_count >= v_coupon.max_uses then
    raise exception 'This coupon has reached its usage limit';
  end if;

  begin
    insert into public.coupon_redemptions (coupon_id, user_id) values (v_coupon.id, p_user_id);
  exception when unique_violation then
    raise exception 'You have already redeemed this coupon';
  end;

  update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  update public.profiles set wallet_balance = wallet_balance + v_coupon.credit_amount where id = p_user_id;
  insert into public.transactions (user_id, type, amount, description)
  values (p_user_id, 'credit', v_coupon.credit_amount, 'Coupon redeemed: ' || p_code);

  return query select v_coupon.credit_amount;
end;
$$;

create or replace function public.request_withdrawal(p_user_id uuid, p_amount numeric, p_method text, p_account_details text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref_balance numeric;
  v_min_amount numeric;
  v_min_verified int;
  v_verified_count int;
  v_enabled text;
  v_id bigint;
begin
  select value into v_enabled from public.settings where key = 'withdrawal_enabled';
  if v_enabled = 'false' then
    raise exception 'Withdrawals are currently disabled';
  end if;

  select coalesce(value::numeric, 0) into v_min_amount from public.settings where key = 'withdrawal_min_amount';
  if p_amount < v_min_amount then
    raise exception 'Minimum withdrawal amount is %', v_min_amount;
  end if;

  select coalesce(value::int, 0) into v_min_verified from public.settings where key = 'withdrawal_min_verified_referrals';
  select count(*) into v_verified_count from public.profiles where referred_by = p_user_id and referral_verified = true;
  if v_verified_count < v_min_verified then
    raise exception 'You need at least % verified referrals to withdraw', v_min_verified;
  end if;

  select referral_balance into v_ref_balance from public.profiles where id = p_user_id for update;
  if v_ref_balance < p_amount then
    raise exception 'Insufficient referral balance';
  end if;

  update public.profiles set referral_balance = referral_balance - p_amount where id = p_user_id;

  insert into public.withdrawals (user_id, amount, method, account_details, status)
  values (p_user_id, p_amount, p_method, p_account_details, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.cancel_smm_order(p_order_id bigint, p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  select * into v_order from public.smm_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if not p_is_admin and v_order.user_id != p_user_id then
    raise exception 'Not your order';
  end if;
  if v_order.status in ('completed', 'cancelled') then
    raise exception 'Order already %', v_order.status;
  end if;

  update public.smm_orders set status = 'cancelled', updated_at = now() where id = p_order_id;
  update public.profiles set wallet_balance = wallet_balance + v_order.price where id = v_order.user_id;
  insert into public.transactions (user_id, type, amount, description)
  values (v_order.user_id, 'credit', v_order.price, 'Refund: cancelled SMM order (' || v_order.service_title || ')');
end;
$$;

create or replace function public.check_api_rate_limit(p_api_key_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket timestamptz := date_trunc('minute', now());
  v_count int;
begin
  insert into public.api_key_usage (api_key_id, minute_bucket, count)
  values (p_api_key_id, v_bucket, 1)
  on conflict (api_key_id, minute_bucket)
  do update set count = public.api_key_usage.count + 1
  returning count into v_count;

  return v_count <= 60;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- All privileged reads/writes go through the API functions using the
-- service-role key (which bypasses RLS), so these policies only need to
-- cover what the browser reads directly via the Supabase client.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.number_requests enable row level security;
alter table public.mailboxes enable row level security;
alter table public.transactions enable row level security;
alter table public.payment_requests enable row level security;
alter table public.withdrawals enable row level security;
alter table public.smm_services enable row level security;
alter table public.smm_orders enable row level security;
alter table public.announcements enable row level security;
alter table public.api_keys enable row level security;
alter table public.settings enable row level security;
alter table public.coupons enable row level security;
alter table public.service_prices enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "own numbers" on public.number_requests;
create policy "own numbers" on public.number_requests for select using (auth.uid() = user_id);

drop policy if exists "own mailboxes" on public.mailboxes;
create policy "own mailboxes" on public.mailboxes for select using (auth.uid() = user_id);

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions for select using (auth.uid() = user_id);

drop policy if exists "own payments" on public.payment_requests;
create policy "own payments" on public.payment_requests for select using (auth.uid() = user_id);

drop policy if exists "own withdrawals" on public.withdrawals;
create policy "own withdrawals" on public.withdrawals for select using (auth.uid() = user_id);

drop policy if exists "own smm orders" on public.smm_orders;
create policy "own smm orders" on public.smm_orders for select using (auth.uid() = user_id);

drop policy if exists "own api keys" on public.api_keys;
create policy "own api keys" on public.api_keys for select using (auth.uid() = user_id);

drop policy if exists "public smm services" on public.smm_services;
create policy "public smm services" on public.smm_services for select using (active = true);

drop policy if exists "public announcements" on public.announcements;
create policy "public announcements" on public.announcements for select using (active = true);

-- settings, coupons and service_prices are NOT publicly selectable (the
-- mother API key lives in `settings`) — the app reads public config only
-- through /api/public-settings, which filters to a safe allow-list.

-- ============================================================================
-- SEED — sensible starting settings (edit values from Admin -> Settings after)
-- ============================================================================
insert into public.settings (key, value) values
  ('site_name', 'My Number Store'),
  ('price_per_number', '5.00'),
  ('number_hold_minutes', '20'),
  ('min_topup_amount', '100'),
  ('mother_api_base_url', ''),
  ('mother_api_key', ''),
  ('smm_markup_percent', '20'),
  ('maintenance_enabled', 'false'),
  ('withdrawal_enabled', 'true'),
  ('withdrawal_min_amount', '500'),
  ('withdrawal_min_verified_referrals', '0'),
  ('referral_first_bonus', '0'),
  ('referral_commission_pct', '0'),
  ('referral_milestone_count', '10'),
  ('referral_milestone_bonus', '0'),
  ('ai_verify_enabled', 'false')
on conflict (key) do nothing;

-- ============================================================================
-- After running this file:
-- 1. Create your first admin: sign up normally on the site, then run:
--      update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
-- 2. Log into Admin -> Settings and fill in:
--      - Site name / logo
--      - Mother API base URL + Mother API key (generate this key on the
--        mother site's own "API Keys" page)
-- 3. Add SMM services (Admin -> SMM Services), each with the matching
--    "mother_service_id" from the mother site's SMM catalog.
-- ============================================================================
