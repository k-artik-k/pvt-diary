alter table public.posts
add column if not exists is_pinned boolean;

update public.posts
set is_pinned = false
where is_pinned is null;

alter table public.posts
alter column is_pinned set default false;

alter table public.posts
alter column is_pinned set not null;
