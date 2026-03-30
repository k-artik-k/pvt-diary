-- ============================================
-- Pvt-Diary Patch: Username Uniqueness
-- Run this AFTER the main schema
-- ============================================

-- Allow anyone to check if a username exists (needed for signup validation)
create policy "Anyone can check username availability"
  on public.profiles for select
  using (true);

-- Drop the old restrictive select policy (it conflicts)
drop policy if exists "Users can view own profile" on public.profiles;
