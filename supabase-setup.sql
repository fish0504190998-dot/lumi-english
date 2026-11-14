-- Lumi English: cloud progress table for Supabase
-- Paste all of this into Supabase > SQL Editor and press Run.

create table public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- every learner can read and change only their own progress
create policy "read own progress" on public.progress for select using (auth.uid() = user_id);
create policy "insert own progress" on public.progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own progress" on public.progress for delete using (auth.uid() = user_id);
