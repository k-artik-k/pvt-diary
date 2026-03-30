-- ============================================
-- Pvt-Diary Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================
-- 1. PROFILES
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. TAGS
-- ============================================
create table public.tags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null check (char_length(name) <= 20),
  pill_color text default '#3b82f6',
  text_color text default '#ffffff',
  created_at timestamptz default now(),
  unique(user_id, name)
);

alter table public.tags enable row level security;

create policy "Users can view own tags"
  on public.tags for select using (auth.uid() = user_id);
create policy "Users can insert own tags"
  on public.tags for insert with check (auth.uid() = user_id);
create policy "Users can update own tags"
  on public.tags for update using (auth.uid() = user_id);
create policy "Users can delete own tags"
  on public.tags for delete using (auth.uid() = user_id);

-- ============================================
-- 3. SPACES
-- ============================================
create table public.spaces (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text default '📁',
  tag_id uuid references public.tags on delete set null,
  show_in_menu boolean default true,
  share_link uuid default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table public.spaces enable row level security;

create policy "Users can view own spaces"
  on public.spaces for select using (auth.uid() = user_id);
create policy "Users can insert own spaces"
  on public.spaces for insert with check (auth.uid() = user_id);
create policy "Users can update own spaces"
  on public.spaces for update using (auth.uid() = user_id);
create policy "Users can delete own spaces"
  on public.spaces for delete using (auth.uid() = user_id);

-- ============================================
-- 4. SPACE MEMBERS (verified people)
-- ============================================
create table public.space_members (
  id uuid default gen_random_uuid() primary key,
  space_id uuid references public.spaces on delete cascade not null,
  member_username text not null,
  added_by uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique(space_id, member_username)
);

alter table public.space_members enable row level security;

create policy "Space owners can manage members"
  on public.space_members for all using (auth.uid() = added_by);

-- ============================================
-- 5. POSTS
-- ============================================
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null default '',
  subtitle text default '',
  body text default '',
  is_markdown boolean default false,
  is_draft boolean default false,
  passphrase_hash text,
  encrypted_body text,
  date_tag date,
  space_id uuid references public.spaces on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Users can view own posts"
  on public.posts for select using (auth.uid() = user_id);
create policy "Users can insert own posts"
  on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts"
  on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- Shared space members can view posts in their space
create policy "Space members can view shared posts"
  on public.posts for select using (
    space_id in (
      select sm.space_id from public.space_members sm
      join public.profiles p on p.username = sm.member_username
      where p.id = auth.uid()
    )
  );

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.update_updated_at();

-- ============================================
-- 6. POST TAGS (many-to-many)
-- ============================================
create table public.post_tags (
  post_id uuid references public.posts on delete cascade not null,
  tag_id uuid references public.tags on delete cascade not null,
  primary key (post_id, tag_id)
);

alter table public.post_tags enable row level security;

create policy "Users can manage own post tags"
  on public.post_tags for all using (
    post_id in (select id from public.posts where user_id = auth.uid())
  );
create policy "Space members can view shared post tags"
  on public.post_tags for select using (
    post_id in (
      select p.id from public.posts p
      where p.space_id in (
        select sm.space_id from public.space_members sm
        join public.profiles pr on pr.username = sm.member_username
        where pr.id = auth.uid()
      )
    )
  );

-- ============================================
-- 7. POST ACTIVITY (view tracking)
-- ============================================
create table public.post_activity (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts on delete cascade not null,
  viewer_id uuid references auth.users on delete cascade not null,
  viewer_username text not null,
  action text check (action in ('viewed', 'read')) default 'viewed',
  created_at timestamptz default now()
);

alter table public.post_activity enable row level security;

-- Post owners can view activity on their posts
create policy "Post owners can view activity"
  on public.post_activity for select using (
    post_id in (select id from public.posts where user_id = auth.uid())
  );

-- Any authenticated user can insert activity
create policy "Users can log activity"
  on public.post_activity for insert with check (auth.uid() = viewer_id);

-- ============================================
-- 8. STORAGE BUCKET for images
-- ============================================
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict do nothing;

create policy "Authenticated users can upload images"
  on storage.objects for insert with check (
    bucket_id = 'post-images' and auth.role() = 'authenticated'
  );

create policy "Anyone can view post images"
  on storage.objects for select using (bucket_id = 'post-images');

create policy "Users can delete own images"
  on storage.objects for delete using (
    bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 9. INDEXES for performance
-- ============================================
create index idx_posts_user_id on public.posts(user_id);
create index idx_posts_created_at on public.posts(created_at desc);
create index idx_posts_space_id on public.posts(space_id);
create index idx_posts_date_tag on public.posts(date_tag);
create index idx_posts_title_search on public.posts using gin(to_tsvector('english', title));
create index idx_tags_user_id on public.tags(user_id);
create index idx_spaces_user_id on public.spaces(user_id);
create index idx_post_tags_post on public.post_tags(post_id);
create index idx_post_tags_tag on public.post_tags(tag_id);
