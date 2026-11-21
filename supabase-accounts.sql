-- Lumi English: real accounts (e-mail + password). Paste ALL of this into Supabase > SQL Editor and press Run.
-- Safe to run again and again: it only creates what is missing and never deletes anyone's data.
-- What it sets up:
--   1. public.progress: one row per person (their saved progress), readable and writable ONLY by that person.
--   2. delete_my_account(): lets a signed-in person delete their own account and everything attached to it.
--   3. the optional list of registered people (profiles), so the owner can see name + e-mail + date in the dashboard.

-- 1. progress --------------------------------------------------------------------------------------------
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,   -- deleting the login deletes the progress too
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;

drop policy if exists "read own progress"   on public.progress;
drop policy if exists "insert own progress" on public.progress;
drop policy if exists "update own progress" on public.progress;
drop policy if exists "delete own progress" on public.progress;
create policy "read own progress"   on public.progress for select using (auth.uid() = user_id);
create policy "insert own progress" on public.progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own progress" on public.progress for delete using (auth.uid() = user_id);

-- only signed-in people touch this table; the public (anonymous) key cannot
revoke all on public.progress from anon;
grant select, insert, update, delete on public.progress to authenticated;

-- 2. delete my account -----------------------------------------------------------------------------------
-- removes the login; progress, profile and community stories follow by "on delete cascade"
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 3. a readable list of registered people (owner only: no policy means the website's keys cannot read it) ---
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz default now()
);
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

-- quick check (should show: progress_rows = 0 on a fresh start)
select (select count(*) from public.progress) as progress_rows, (select count(*) from public.profiles) as registered_people;
