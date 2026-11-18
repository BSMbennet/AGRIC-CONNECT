-- Farmer subscriptions unlock selected premium agricultural product guidance.
-- Farmer registration, produce listings and buyer discovery remain free.
create table public.farmer_subscriptions (
 id uuid primary key default gen_random_uuid(),
 farmer_id uuid not null references public.profiles(id) on delete cascade,
 plan text not null check (plan in ('pro','premium')),
 status text not null check (status in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')),
 stripe_customer_id text,
 stripe_subscription_id text unique,
 current_period_end timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index farmer_subscriptions_farmer_idx on public.farmer_subscriptions(farmer_id,status,current_period_end desc);
alter table public.farmer_subscriptions enable row level security;
create policy "farmers read own subscriptions" on public.farmer_subscriptions for select to authenticated using (farmer_id=(select auth.uid()));
grant select on public.farmer_subscriptions to authenticated;
revoke insert,update,delete on public.farmer_subscriptions from anon,authenticated;

create table public.farmer_products (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 category text not null check (category in ('seeds','fertiliser','crop_protection','equipment','irrigation','soil_health','other')),
 summary text not null,
 required_plan text not null default 'free' check (required_plan in ('free','pro','premium')),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create index farmer_products_active_idx on public.farmer_products(is_active,category);
create table public.farmer_product_content (
 product_id uuid primary key references public.farmer_products(id) on delete cascade,
 description text not null,
 usage_guidance text not null default '',
 safety_notes text not null default '',
 updated_at timestamptz not null default now()
);
alter table public.farmer_products enable row level security;
alter table public.farmer_product_content enable row level security;
create policy "active product catalogue is readable" on public.farmer_products for select to anon,authenticated using (is_active);
create policy "product details require entitled farmer plan" on public.farmer_product_content for select to authenticated using (
 exists(select 1 from public.farmer_products p where p.id=product_id and p.is_active and (
  p.required_plan='free' or (
   public.current_role_name()='farmer' and exists(select 1 from public.farmer_subscriptions s
    where s.farmer_id=(select auth.uid()) and s.status in ('active','trialing') and s.current_period_end>now()
    and ((p.required_plan='pro' and s.plan in ('pro','premium')) or (p.required_plan='premium' and s.plan='premium'))
   )
  )
 ))
);
grant select on public.farmer_products to anon,authenticated;
grant select on public.farmer_product_content to authenticated;
revoke insert,update,delete on public.farmer_products,public.farmer_product_content from anon,authenticated;
