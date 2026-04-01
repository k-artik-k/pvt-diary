-- ============================================
-- Pvt-Diary Patch: Shared Space Access Fix
-- Run this on an existing database
-- ============================================

drop policy if exists "Users can view related memberships" on public.space_members;

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
