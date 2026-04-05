create or replace function public.handle_username_change()
returns trigger as $$
begin
  update public.space_members
  set member_username = new.username
  where member_username = old.username;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop table if exists public.post_activity cascade;
