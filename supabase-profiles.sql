-- Lumi English: a readable list of everyone who registered (name + e-mail + date).
-- Run once in Supabase -> SQL Editor. Safe to run again (it only adds; it never deletes).
-- The owner reads the list in the dashboard: Table Editor -> profiles (it has an Export to CSV button).
-- Passwords are never stored in readable form (Supabase keeps only a hash), so nobody, including the owner, can see them.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz default now()
);

-- Row level security ON and no policy: the website's keys cannot read or write this table, only the owner (dashboard / service role).
alter table public.profiles enable row level security;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, created_at)
  values (new.id, new.email,
          coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
          coalesce(new.created_at, now()))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- people who registered before this script existed (name falls back to the part of the e-mail before the @)
insert into public.profiles (id, email, name, created_at)
select id, email, coalesce(nullif(trim(raw_user_meta_data->>'name'), ''), split_part(email, '@', 1)), created_at
from auth.users
on conflict (id) do nothing;

-- quick check: how many registered people there are
select count(*) as registered_people from public.profiles;
