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
