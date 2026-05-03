-- ============================================================
-- ShoppingVegan.com — Ad Placements (Brand Banners)
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

create table ad_placements (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  placement     text not null default 'category_sidebar',
  image_url     text not null,
  link_url      text not null,
  alt_text      text not null default '',
  category_id   uuid references categories(id) on delete set null,
  is_active     boolean not null default true,
  start_date    timestamptz,
  end_date      timestamptz,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index ad_placements_category_id_idx on ad_placements(category_id);
create index ad_placements_placement_idx on ad_placements(placement);
create index ad_placements_is_active_idx on ad_placements(is_active);

-- Allow public read access (banners are shown to all visitors)
alter table ad_placements enable row level security;
create policy "Ad placements are publicly readable" on ad_placements for select using (true);
create policy "Only admins can manage ad placements" on ad_placements for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
) with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
