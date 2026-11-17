create extension if not exists "pgcrypto";

create type user_role as enum ('farmer','buyer','agent','cooperative_manager','admin');
create type listing_status as enum ('draft','active','paused','sold','expired','moderated');
create type request_status as enum ('pending','accepted','rejected','cancelled');
create type order_status as enum ('pending','accepted','rejected','cancelled','fulfilled','disputed');
create type source_channel as enum ('app','agent','sms','ussd','import');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'farmer',
  display_name text not null,
  phone_e164 text,
  preferred_language text not null default 'en',
  district text,
  municipality text,
  locality text,
  cooperative_id uuid,
  created_by_agent_id uuid references profiles(id) on delete set null,
  onboarding_status text not null default 'self' check (onboarding_status in ('self','agent_assisted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cooperatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  locality text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now()
);

alter table profiles add constraint profiles_coop_fk foreign key (cooperative_id) references cooperatives(id);

create table produce_listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references profiles(id),
  cooperative_id uuid references cooperatives(id),
  category text not null,
  produce_name text not null,
  quantity_available numeric not null check (quantity_available >= 0),
  reserved_quantity numeric not null default 0 check (reserved_quantity >= 0),
  quantity_sold numeric not null default 0 check (quantity_sold >= 0),
  unit text not null check (unit in ('kg','bunch','crate','bag')),
  asking_price numeric not null check (asking_price >= 0),
  currency char(3) not null default 'ZAR',
  price_unit text not null default 'kg',
  harvest_date date,
  available_from date not null default current_date,
  expires_at timestamptz,
  quality_notes text,
  locality text not null,
  municipality text,
  district text,
  image_path text,
  status listing_status not null default 'draft',
  source_channel source_channel not null default 'app',
  client_submission_id uuid,
  moderation_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_integrity check (reserved_quantity + quantity_sold <= quantity_available),
  constraint client_submission_unique unique (farmer_id, client_submission_id)
);

create index listings_marketplace_idx on produce_listings (status, category, locality, available_from);
create index listings_farmer_idx on produce_listings (farmer_id);

create table buyer_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references produce_listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id),
  quantity_requested numeric not null check (quantity_requested > 0),
  proposed_price numeric check (proposed_price >= 0),
  message text,
  status request_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index requests_listing_idx on buyer_requests (listing_id, status);
create index requests_buyer_idx on buyer_requests (buyer_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id),
  listing_id uuid references produce_listings(id),
  quantity_agreed numeric not null check (quantity_agreed > 0),
  unit text not null,
  unit_price numeric not null check (unit_price >= 0),
  currency char(3) not null default 'ZAR',
  status order_status not null default 'pending',
  collection_method text,
  collection_point text,
  collection_window_start timestamptz,
  collection_window_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_buyer_idx on orders (buyer_id, status);

create table order_allocations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  listing_id uuid not null references produce_listings(id),
  farmer_id uuid not null references profiles(id),
  quantity_allocated numeric not null check (quantity_allocated > 0),
  agreed_unit_price numeric not null check (agreed_unit_price >= 0)
);
create index allocations_order_idx on order_allocations (order_id);
create index allocations_farmer_idx on order_allocations (farmer_id);

create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  actor_profile_id uuid references profiles(id),
  event_type text not null,
  from_status order_status,
  to_status order_status,
  note text,
  created_at timestamptz not null default now()
);

create table consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  consent_type text not null,
  consent_version text not null,
  granted boolean not null,
  method text not null check (method in ('web_form','agent_in_person')),
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
