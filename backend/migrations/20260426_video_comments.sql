create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.project_videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 500),
  created_at timestamp with time zone not null default now()
);

create index if not exists video_comments_video_id_created_idx
  on public.video_comments(video_id, created_at desc);

alter table public.video_comments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'video_comments'
      and policyname = 'Anyone can read video comments'
  ) then
    create policy "Anyone can read video comments"
      on public.video_comments
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'video_comments'
      and policyname = 'Users can create own video comments'
  ) then
    create policy "Users can create own video comments"
      on public.video_comments
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'video_comments'
      and policyname = 'Users can delete own video comments'
  ) then
    create policy "Users can delete own video comments"
      on public.video_comments
      for delete
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;
