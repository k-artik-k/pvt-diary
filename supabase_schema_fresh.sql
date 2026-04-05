-- ============================================
-- Pvt-Diary Fresh Supabase Schema
-- Use this on a brand-new Supabase project
-- ============================================

create extension if not exists "pgcrypto";

-- ============================================
-- 1. TABLES
-- ============================================

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (char_length(name) <= 20),
  pill_color text not null default '#3b82f6',
  text_color text not null default '#ffffff',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  icon text not null default '📁',
  tag_id uuid references public.tags on delete set null,
  show_in_menu boolean not null default true,
  share_link uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces on delete cascade,
  member_username text not null,
  added_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique (space_id, member_username)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null default '',
  subtitle text default '',
  body text default '',
  is_markdown boolean not null default false,
  is_draft boolean not null default false,
  is_pinned boolean not null default false,
  passphrase_hash text,
  encrypted_body text,
  date_tag date,
  space_id uuid references public.spaces on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_tags (
  post_id uuid not null references public.posts on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  primary key (post_id, tag_id)
);

alter table public.profiles enable row level security;
alter table public.tags enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_tags enable row level security;

-- ============================================
-- 2. FUNCTIONS AND TRIGGERS
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(coalesce(new.email, 'user'), '@', 1) || '_' || left(new.id::text, 6)
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.handle_username_change()
returns trigger as $$
begin
  update public.space_members
  set member_username = new.username
  where member_username = old.username;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.delete_my_account()
returns boolean as $$
declare
  account_id uuid := auth.uid();
  account_username text;
begin
  if account_id is null then
    raise exception 'Not authenticated';
  end if;

  select username into account_username
  from public.profiles
  where id = account_id;

  delete from storage.objects
  where bucket_id = 'post-images'
    and name like account_id::text || '/%';

  if account_username is not null then
    delete from public.space_members
    where member_username = account_username;
  end if;

  delete from auth.users
  where id = account_id;

  return true;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists on_profile_username_updated on public.profiles;
create trigger on_profile_username_updated
  after update of username on public.profiles
  for each row
  when (old.username is distinct from new.username)
  execute procedure public.handle_username_change();

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.update_updated_at();

-- ============================================
-- 3. POLICIES
-- ============================================

drop policy if exists "Anyone can check username availability" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Anyone can check username availability"
  on public.profiles
  for select
  using (true);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can view own tags" on public.tags;
drop policy if exists "Users can view accessible tags" on public.tags;
drop policy if exists "Users can insert own tags" on public.tags;
drop policy if exists "Users can update own tags" on public.tags;
drop policy if exists "Users can delete own tags" on public.tags;

create policy "Users can view own tags"
  on public.tags
  for select
  using (auth.uid() = user_id);

create policy "Users can view accessible tags"
  on public.tags
  for select
  using (
    auth.uid() = user_id
    or id in (
      select pt.tag_id
      from public.post_tags pt
      join public.posts p on p.id = pt.post_id
      where p.space_id in (
        select sm.space_id
        from public.space_members sm
        join public.profiles pr on pr.username = sm.member_username
        where pr.id = auth.uid()
      )
    )
    or id in (
      select sp.tag_id
      from public.spaces sp
      where sp.tag_id is not null
        and sp.id in (
          select sm.space_id
          from public.space_members sm
          join public.profiles pr on pr.username = sm.member_username
          where pr.id = auth.uid()
        )
    )
  );

create policy "Users can insert own tags"
  on public.tags
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on public.tags
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own tags"
  on public.tags
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view accessible spaces" on public.spaces;
drop policy if exists "Users can insert own spaces" on public.spaces;
drop policy if exists "Users can update own spaces" on public.spaces;
drop policy if exists "Users can delete own spaces" on public.spaces;

create policy "Users can view accessible spaces"
  on public.spaces
  for select
  using (
    auth.uid() = user_id
    or id in (
      select sm.space_id
      from public.space_members sm
      join public.profiles pr on pr.username = sm.member_username
      where pr.id = auth.uid()
    )
  );

create policy "Users can insert own spaces"
  on public.spaces
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own spaces"
  on public.spaces
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own spaces"
  on public.spaces
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Space owners can manage members" on public.space_members;
drop policy if exists "Users can view related memberships" on public.space_members;

create policy "Space owners can manage members"
  on public.space_members
  for all
  using (auth.uid() = added_by)
  with check (auth.uid() = added_by);

create policy "Users can view related memberships"
  on public.space_members
  for select
  using (
    auth.uid() = added_by
    or member_username in (
      select p.username
      from public.profiles p
      where p.id = auth.uid()
    )
  );

drop policy if exists "Users can view own posts" on public.posts;
drop policy if exists "Space members can view shared posts" on public.posts;
drop policy if exists "Users can insert own posts" on public.posts;
drop policy if exists "Users can update own posts" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;

create policy "Users can view own posts"
  on public.posts
  for select
  using (auth.uid() = user_id);

create policy "Space members can view shared posts"
  on public.posts
  for select
  using (
    space_id in (
      select sm.space_id
      from public.space_members sm
      join public.profiles p on p.username = sm.member_username
      where p.id = auth.uid()
    )
  );

create policy "Users can insert own posts"
  on public.posts
  for insert
  with check (
    auth.uid() = user_id
    and (
      space_id is null
      or space_id in (
        select s.id
        from public.spaces s
        where s.user_id = auth.uid()
      )
    )
  );

create policy "Users can update own posts"
  on public.posts
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      space_id is null
      or space_id in (
        select s.id
        from public.spaces s
        where s.user_id = auth.uid()
      )
    )
  );

create policy "Users can delete own posts"
  on public.posts
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own post tags" on public.post_tags;
drop policy if exists "Space members can view shared post tags" on public.post_tags;

create policy "Users can manage own post tags"
  on public.post_tags
  for all
  using (
    post_id in (
      select id
      from public.posts
      where user_id = auth.uid()
    )
  )
  with check (
    post_id in (
      select id
      from public.posts
      where user_id = auth.uid()
    )
  );

create policy "Space members can view shared post tags"
  on public.post_tags
  for select
  using (
    post_id in (
      select p.id
      from public.posts p
      where p.space_id in (
        select sm.space_id
        from public.space_members sm
        join public.profiles pr on pr.username = sm.member_username
        where pr.id = auth.uid()
      )
    )
  );

-- ============================================
-- 4. STORAGE
-- ============================================

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict do nothing;

drop policy if exists "Authenticated users can upload images" on storage.objects;
drop policy if exists "Anyone can view post images" on storage.objects;
drop policy if exists "Users can delete own images" on storage.objects;

create policy "Authenticated users can upload images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
  );

create policy "Anyone can view post images"
  on storage.objects
  for select
  using (bucket_id = 'post-images');

create policy "Users can delete own images"
  on storage.objects
  for delete
  using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 5. INDEXES
-- ============================================

create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_posts_space_id on public.posts(space_id);
create index if not exists idx_posts_date_tag on public.posts(date_tag);
create index if not exists idx_posts_title_search on public.posts using gin(to_tsvector('english', title));
create index if not exists idx_tags_user_id on public.tags(user_id);
create index if not exists idx_spaces_user_id on public.spaces(user_id);
create index if not exists idx_spaces_share_link on public.spaces(share_link);
create index if not exists idx_space_members_space_id on public.space_members(space_id);
create index if not exists idx_space_members_member_username on public.space_members(member_username);
create index if not exists idx_post_tags_post on public.post_tags(post_id);
create index if not exists idx_post_tags_tag on public.post_tags(tag_id);
