-- Lumi English: community stories, reports and account deletion
-- Run this whole file once in Supabase > SQL Editor (after supabase-setup.sql, which created "progress").

-- 1. Community stories -------------------------------------------------------
create table if not exists public.community_stories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  author_name   text not null check (char_length(author_name) between 1 and 40),
  title         text not null check (char_length(title) between 1 and 120),
  content       text not null check (char_length(content) between 20 and 60000),
  level         smallint not null default 1 check (level between 1 and 4),
  topic         text not null default 'יומיום' check (char_length(topic) <= 40),
  cover_emoji   text check (char_length(cover_emoji) <= 16),
  cover_image   text check (cover_image is null or (cover_image like 'data:image/jpeg;base64,%' and char_length(cover_image) <= 200000)),
  is_approved   boolean not null default true,
  reports_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists community_stories_created_idx on public.community_stories (created_at desc);

alter table public.community_stories enable row level security;

-- anyone (logged in or not) can read approved stories; authors also see their own hidden ones
drop policy if exists "read approved stories" on public.community_stories;
create policy "read approved stories" on public.community_stories
  for select to anon, authenticated using (is_approved = true or auth.uid() = user_id);

-- only logged-in users can publish, and only as themselves
drop policy if exists "insert own story" on public.community_stories;
create policy "insert own story" on public.community_stories
  for insert to authenticated with check (auth.uid() = user_id);

-- authors can edit and delete only their own stories
drop policy if exists "update own story" on public.community_stories;
create policy "update own story" on public.community_stories
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own story" on public.community_stories;
create policy "delete own story" on public.community_stories
  for delete to authenticated using (auth.uid() = user_id);

-- authors cannot approve their own story or reset its reports: those fields are kept by the server
create or replace function public.protect_story_fields() returns trigger
language plpgsql as $$
begin
  -- only app users (anon / authenticated) are restricted; the report counter and the dashboard may change these fields
  if current_user not in ('anon', 'authenticated') then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_approved := true;
    new.reports_count := 0;
    new.created_at := now();
  else
    new.is_approved := old.is_approved;
    new.reports_count := old.reports_count;
    new.created_at := old.created_at;
    new.user_id := old.user_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists protect_story_fields on public.community_stories;
create trigger protect_story_fields before insert or update on public.community_stories
  for each row execute function public.protect_story_fields();

-- 2. Reports -------------------------------------------------------------------
create table if not exists public.story_reports (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid not null references public.community_stories(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason      text not null check (reason in ('inappropriate','copyright','spam','other')),
  details     text check (char_length(details) <= 500),
  created_at  timestamptz not null default now()
);
alter table public.story_reports enable row level security;

-- anyone can report; nobody can read reports through the app (only you, in the Supabase dashboard)
drop policy if exists "anyone can report" on public.story_reports;
create policy "anyone can report" on public.story_reports
  for insert to anon, authenticated
  with check (reporter_id is null or reporter_id = auth.uid());

-- each report raises the story's counter; at 3 reports the story is hidden until you review it
create or replace function public.count_story_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.community_stories
     set reports_count = reports_count + 1,
         is_approved = case when reports_count + 1 >= 3 then false else is_approved end
   where id = new.story_id;
  return new;
end $$;
drop trigger if exists count_story_report on public.story_reports;
create trigger count_story_report after insert on public.story_reports
  for each row execute function public.count_story_report();

-- 3. "Delete my account and data" ------------------------------------------------
-- deletes the caller's login, progress and community stories (they cascade from auth.users)
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

-- table access for the app's API roles (row level security above still decides which rows)
grant select on public.community_stories to anon, authenticated;
grant insert, update, delete on public.community_stories to authenticated;
grant insert on public.story_reports to anon, authenticated;
grant select, insert, update, delete on public.progress to authenticated;
