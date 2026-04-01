-- ============================================
-- Pvt-Diary Patch: Username + Sharing Access
-- Run this ONLY on an existing database
-- ============================================

-- Allow anyone to check if a username exists (needed for signup validation)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Anyone can check username availability" on public.profiles;

create policy "Anyone can check username availability"
  on public.profiles for select
  using (true);

drop policy if exists "Users can view own spaces" on public.spaces;
drop policy if exists "Users can view accessible spaces" on public.spaces;
drop policy if exists "Users can view related memberships" on public.space_members;

create policy "Users can view related memberships"
  on public.space_members for select
  using (
    auth.uid() = added_by
    or member_username in (
      select p.username
      from public.profiles p
      where p.id = auth.uid()
    )
  );

create policy "Users can view accessible spaces"
  on public.spaces for select using (
    auth.uid() = user_id
    or id in (
      select sm.space_id
      from public.space_members sm
      join public.profiles pr on pr.username = sm.member_username
      where pr.id = auth.uid()
    )
  );

drop policy if exists "Users can view own tags" on public.tags;
drop policy if exists "Users can view accessible tags" on public.tags;

create policy "Users can view accessible tags"
  on public.tags for select using (
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

drop policy if exists "Users can insert own posts" on public.posts;
drop policy if exists "Users can update own posts" on public.posts;

create policy "Users can insert own posts"
  on public.posts for insert with check (
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
  on public.posts for update
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

create or replace function public.handle_username_change()
returns trigger as $$
begin
  update public.space_members
  set member_username = new.username
  where member_username = old.username;

  update public.post_activity
  set viewer_username = new.username
  where viewer_id = new.id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_profile_username_updated on public.profiles;

create trigger on_profile_username_updated
  after update of username on public.profiles
  for each row
  when (old.username is distinct from new.username)
  execute procedure public.handle_username_change();
