-- ============================================================
-- ShoppingVegan.com — Initial Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users

create type user_role as enum ('user', 'admin');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  display_name text,
  avatar_url  text,
  role        user_role not null default 'user',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Categories ──────────────────────────────────────────────────────────────

create table categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  parent_id   uuid references categories(id) on delete set null,
  image_url   text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── Brands ──────────────────────────────────────────────────────────────────

create table brands (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  description text,
  logo_url    text,
  website     text,
  is_verified boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Certifications ──────────────────────────────────────────────────────────

create table certifications (
  id       uuid primary key default uuid_generate_v4(),
  slug     text not null unique,
  name     text not null,
  icon_url text
);

insert into certifications (slug, name) values
  ('vegan-certified', 'Vegan Certified'),
  ('cruelty-free', 'Cruelty-Free'),
  ('organic', 'Organic'),
  ('non-gmo', 'Non-GMO'),
  ('fair-trade', 'Fair Trade'),
  ('b-corp', 'B Corp');

-- ─── Ingredients ─────────────────────────────────────────────────────────────

create table ingredients (
  id              uuid primary key default uuid_generate_v4(),
  slug            text not null unique,
  name            text not null,
  description     text,
  is_vegan        boolean not null default true,
  is_cruelty_free boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ─── Products ─────────────────────────────────────────────────────────────────

create type product_status as enum ('draft', 'published', 'archived');

create table products (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  name          text not null,
  description   text,
  image_url     text,
  price         numeric(10,2),
  currency      text not null default 'USD',
  brand_id      uuid not null references brands(id) on delete restrict,
  affiliate_url text,
  skimlinks_url text,
  amazon_asin   text,
  source_url    text,
  status        product_status not null default 'draft',
  algolia_synced_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index products_brand_id_idx on products(brand_id);
create index products_status_idx on products(status);
create index products_slug_idx on products(slug);

-- Junction tables
create table product_categories (
  product_id  uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table product_ingredients (
  product_id    uuid not null references products(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  primary key (product_id, ingredient_id)
);

create table product_certifications (
  product_id       uuid not null references products(id) on delete cascade,
  certification_id uuid not null references certifications(id) on delete cascade,
  primary key (product_id, certification_id)
);

-- ─── Tags ─────────────────────────────────────────────────────────────────────

create table tags (
  id   uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null
);

-- ─── Articles ─────────────────────────────────────────────────────────────────

create type article_status as enum ('draft', 'published');

create table articles (
  id              uuid primary key default uuid_generate_v4(),
  slug            text not null unique,
  title           text not null,
  excerpt         text,
  body            text not null default '',
  cover_image     text,
  author_id       uuid not null references profiles(id) on delete restrict,
  status          article_status not null default 'draft',
  published_at    timestamptz,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index articles_slug_idx on articles(slug);
create index articles_status_idx on articles(status);
create index articles_published_at_idx on articles(published_at desc);

create table article_tags (
  article_id uuid not null references articles(id) on delete cascade,
  tag_id     uuid not null references tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

-- Article ↔ Product embeds (for inline product recommendations)
create table article_products (
  article_id uuid not null references articles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  sort_order int not null default 0,
  primary key (article_id, product_id)
);

create table article_comments (
  id         uuid primary key default uuid_generate_v4(),
  article_id uuid not null references articles(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  parent_id  uuid references article_comments(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index article_comments_article_id_idx on article_comments(article_id);

-- ─── Wishlist ─────────────────────────────────────────────────────────────────

create table wishlists (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index wishlists_user_id_idx on wishlists(user_id);

-- ─── Forum ────────────────────────────────────────────────────────────────────

create table forum_communities (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon_url    text,
  created_at  timestamptz not null default now()
);

insert into forum_communities (slug, name, description) values
  ('general', 'General', 'General vegan discussion'),
  ('products', 'Products', 'Product reviews and recommendations'),
  ('recipes', 'Recipes', 'Vegan recipes and cooking tips'),
  ('lifestyle', 'Lifestyle', 'Vegan lifestyle, health, and wellness'),
  ('news', 'News', 'Vegan news and activism');

create table forum_posts (
  id           uuid primary key default uuid_generate_v4(),
  community_id uuid not null references forum_communities(id) on delete restrict,
  author_id    uuid not null references profiles(id) on delete cascade,
  title        text not null,
  body         text not null,
  vote_count   int not null default 0,
  comment_count int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index forum_posts_community_id_idx on forum_posts(community_id);
create index forum_posts_author_id_idx on forum_posts(author_id);
create index forum_posts_created_at_idx on forum_posts(created_at desc);

create table forum_comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references forum_posts(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  parent_id  uuid references forum_comments(id) on delete cascade,
  body       text not null,
  vote_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forum_comments_post_id_idx on forum_comments(post_id);

-- Unified votes table (handles post votes + comment votes)
create table forum_votes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid references forum_posts(id) on delete cascade,
  comment_id uuid references forum_comments(id) on delete cascade,
  value      smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  -- Ensure vote is for post OR comment, not both
  constraint forum_votes_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  unique (user_id, post_id),
  unique (user_id, comment_id)
);

-- Auto-update vote counts
create or replace function update_vote_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    if new.post_id is not null then
      update forum_posts set vote_count = vote_count + new.value where id = new.post_id;
    else
      update forum_comments set vote_count = vote_count + new.value where id = new.comment_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if old.post_id is not null then
      update forum_posts set vote_count = vote_count - old.value where id = old.post_id;
    else
      update forum_comments set vote_count = vote_count - old.value where id = old.comment_id;
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.post_id is not null then
      update forum_posts set vote_count = vote_count - old.value + new.value where id = new.post_id;
    else
      update forum_comments set vote_count = vote_count - old.value + new.value where id = new.comment_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger forum_vote_count_trigger
  after insert or update or delete on forum_votes
  for each row execute procedure update_vote_count();

-- Auto-update comment counts
create or replace function update_comment_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update forum_posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update forum_posts set comment_count = comment_count - 1 where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger forum_comment_count_trigger
  after insert or delete on forum_comments
  for each row execute procedure update_comment_count();

-- ─── Newsletter ───────────────────────────────────────────────────────────────

create table newsletter_subscribers (
  id           uuid primary key default uuid_generate_v4(),
  email        text not null unique,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── Affiliate Clicks ─────────────────────────────────────────────────────────

create table affiliate_clicks (
  id         uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  user_id    uuid references profiles(id) on delete set null,
  ip         text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index affiliate_clicks_product_id_idx on affiliate_clicks(product_id);
create index affiliate_clicks_created_at_idx on affiliate_clicks(created_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table products enable row level security;
alter table articles enable row level security;
alter table wishlists enable row level security;
alter table article_comments enable row level security;
alter table forum_posts enable row level security;
alter table forum_comments enable row level security;
alter table forum_votes enable row level security;
alter table newsletter_subscribers enable row level security;
alter table affiliate_clicks enable row level security;

-- Profiles: users can read all, edit their own
create policy "Profiles are publicly readable" on profiles for select using (true);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- Products: public read for published
create policy "Published products are publicly readable" on products for select using (status = 'published');
create policy "Admins can manage products" on products for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Articles: public read for published
create policy "Published articles are publicly readable" on articles for select using (status = 'published');
create policy "Admins can manage articles" on articles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Wishlists: users manage their own
create policy "Users can manage their own wishlist" on wishlists for all using (auth.uid() = user_id);

-- Article comments: public read, auth write
create policy "Article comments are publicly readable" on article_comments for select using (true);
create policy "Authenticated users can create comments" on article_comments for insert with check (auth.uid() = author_id);
create policy "Users can delete their own comments" on article_comments for delete using (auth.uid() = author_id);

-- Forum posts: public read, auth write
create policy "Forum posts are publicly readable" on forum_posts for select using (true);
create policy "Authenticated users can create posts" on forum_posts for insert with check (auth.uid() = author_id);
create policy "Users can update their own posts" on forum_posts for update using (auth.uid() = author_id);
create policy "Users can delete their own posts" on forum_posts for delete using (auth.uid() = author_id);

-- Forum comments: public read, auth write
create policy "Forum comments are publicly readable" on forum_comments for select using (true);
create policy "Authenticated users can create comments" on forum_comments for insert with check (auth.uid() = author_id);
create policy "Users can update their own comments" on forum_comments for update using (auth.uid() = author_id);
create policy "Users can delete their own comments" on forum_comments for delete using (auth.uid() = author_id);

-- Forum votes: auth only
create policy "Users can manage their own votes" on forum_votes for all using (auth.uid() = user_id);
create policy "Votes are publicly readable" on forum_votes for select using (true);

-- Newsletter: insert only (no read from client)
create policy "Anyone can subscribe to newsletter" on newsletter_subscribers for insert with check (true);

-- Affiliate clicks: insert only
create policy "Anyone can log affiliate clicks" on affiliate_clicks for insert with check (true);
