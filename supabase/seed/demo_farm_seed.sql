-- AgricNorthX — SAMPLE FARM DATA for demos and pitches.
-- Gives ONE existing farmer account a realistic-looking farm: marketplace listings with pictures and
-- 12 months of bookkeeping entries (which feed the dashboard stats and charts).
--
-- HOW TO USE (Supabase dashboard > SQL editor, as the project owner):
--   1. Change v_email below to the farmer's login email.
--   2. Run the whole script. It is safe to run again: it updates its own sample listings and replaces
--      its own sample bookkeeping rows. It never touches rows you created yourself.
--
-- HONESTY: every row is labelled "[Sample data]" (in the listing quality notes and the bookkeeping
-- descriptions). These are NOT real sales. Do not present them as real results to judges or funders;
-- say they are sample data. Remove them with demo_farm_cleanup.sql.
-- Requires migrations up to 027 (bookkeeping stats) and 011 (image_urls). Product pictures are
-- the original illustrations in frontend/public/demo/products/ served by the web app.

do $seed$
declare
  v_email text := 'CHANGE-ME@example.com';   -- <<< the farmer's email
  v_id uuid; v_role text; v_loc text; v_muni text; v_dist text;
  m int; i int; v_start date; v_day date;
  r record;
begin
  select id into v_id from auth.users where lower(email) = lower(v_email);
  if v_id is null then raise exception 'No account found for %. Edit v_email at the top of the script.', v_email; end if;
  select role::text, coalesce(nullif(locality,''),'Thohoyandou'), municipality, coalesce(district,'Vhembe')
    into v_role, v_loc, v_muni, v_dist from public.profiles where id = v_id;
  if v_role is distinct from 'farmer' then raise exception 'That account is not a farmer (role: %).', coalesce(v_role,'no profile'); end if;

  -- The free plan allows 10 active listings. Sample listings would trip that limit on an account that already
  -- has listings, so the limit trigger is switched off for this script only and switched back on at the end
  -- (this block is one transaction: if anything fails, everything including this change is rolled back).
  alter table public.produce_listings disable trigger farmer_listing_limit_guard;

  -- 1) Marketplace listings (one per product; updated in place on re-run)
  for r in select * from (values
    ('Vegetables','Tomatoes',        'kg',   'kg',   520, 180, 18.00, true,  '/demo/products/tomatoes.svg',  'Firm, vine-ripened tomatoes. Graded and packed in crates.'),
    ('Vegetables','Spinach',         'bunch','bunch',240,  90,  9.50, true,  '/demo/products/spinach.svg',   'Picked the morning of delivery. Washed, tied in bunches.'),
    ('Vegetables','Butternut',       'kg',   'kg',   800, 260,  8.00, false, '/demo/products/butternut.svg', 'Mature, hard-skinned butternut. Good keeping quality.'),
    ('Fruit',     'Mangoes',         'kg',   'kg',   400, 120, 22.00, false, '/demo/products/mangoes.svg',   'Sweet, tree-ripened mangoes. Seasonal.'),
    ('Grains',    'Maize (fresh cobs)','kg', 'kg',   600, 210,  6.50, false, '/demo/products/maize.svg',     'Fresh green maize, harvested to order.'),
    ('Livestock', 'Indigenous chickens','head','head',60,  14, 145.00, false,'/demo/products/chickens.svg', 'Free-range indigenous chickens, vaccinated.'),
    ('Manure',    'Composted cattle manure','bag','bag',150, 45, 35.00, false,'/demo/products/manure.svg',   'Well-composted, ready to spread. 20 kg bags.')
  ) as t(category, name, unit, price_unit, qty, sold, price, organic, img, notes)
  loop
    if exists (select 1 from public.produce_listings l where l.farmer_id = v_id and l.produce_name = r.name and l.quality_notes like '[Sample data]%') then
      update public.produce_listings set
        category = r.category, quantity_available = r.qty, quantity_sold = r.sold, unit = r.unit, price_unit = r.price_unit,
        asking_price = r.price, is_organic = r.organic, image_urls = array[r.img],
        quality_notes = '[Sample data] ' || r.notes, status = 'active', updated_at = now()
      where farmer_id = v_id and produce_name = r.name and quality_notes like '[Sample data]%';
    else
      insert into public.produce_listings
        (farmer_id, category, produce_name, quantity_available, quantity_sold, unit, price_unit, asking_price, currency,
         is_organic, image_urls, quality_notes, locality, municipality, district, available_from, harvest_date, status, source_channel)
      values
        (v_id, r.category, r.name, r.qty, r.sold, r.unit, r.price_unit, r.price, 'ZAR',
         r.organic, array[r.img], '[Sample data] ' || r.notes, v_loc, v_muni, v_dist, current_date - 3, current_date - 4, 'active', 'app');
    end if;
  end loop;

  -- 2) Bookkeeping: replace this script's own manual sample rows, then add 12 months
  delete from public.farm_bookkeeping_entries
   where owner_id = v_id and entry_source = 'manual' and description like '[Sample data]%';

  for m in 0..11 loop
    v_start := (date_trunc('month', current_date) - make_interval(months => m))::date;
    -- income: three sales a month, trending up over the year with a mild seasonal wobble
    for i in 1..3 loop
      v_day := least(current_date, v_start + (i * 8 - 3));
      insert into public.farm_bookkeeping_entries (owner_id, entry_type, category, amount, entry_date, description, entry_source, payment_status)
      values (
        v_id, 'income', 'Produce sale',
        round((1500 + (11 - m) * 210 + i * 640 + ((m * 7 + i * 3) % 5) * 180)::numeric, 2),
        v_day,
        '[Sample data] ' || (array['Tomatoes and spinach — local traders','Butternut and maize — school supplier','Mangoes and chickens — roadside and market'])[i],
        'manual',
        case when m = 0 and i = 3 then 'unpaid' when m = 1 and i = 3 then 'unpaid' else 'paid' end
      );
    end loop;
    -- expenses: six regular costs
    for i in 1..6 loop
      v_day := least(current_date, v_start + (i * 4 - 2));
      insert into public.farm_bookkeeping_entries (owner_id, entry_type, category, amount, entry_date, description, entry_source, payment_status)
      values (
        v_id, 'expense',
        (array['Seed & seedlings','Fertiliser & compost','Labour','Transport','Water & irrigation','Packaging'])[i],
        round(((array[420,380,900,350,260,210])[i] + ((m * 5 + i * 2) % 4) * 45 + (11 - m) * 12)::numeric, 2),
        v_day,
        '[Sample data] ' || (array['Seed and seedlings','Fertiliser and compost','Casual labour','Transport to market','Water and irrigation','Crates and packaging'])[i],
        'manual', 'paid'
      );
    end loop;
  end loop;

  alter table public.produce_listings enable trigger farmer_listing_limit_guard;

  raise notice 'Sample farm data loaded for % (listings + 12 months of bookkeeping).', v_email;
end
$seed$;
