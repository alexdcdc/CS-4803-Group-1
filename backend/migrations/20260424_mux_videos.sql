alter table public.project_videos
  add column if not exists upload_id text,
  add column if not exists asset_id text,
  add column if not exists playback_id text,
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'asset_created', 'preparing', 'ready', 'errored', 'cancelled')),
  add column if not exists duration_seconds numeric,
  add column if not exists video_url text;

create unique index if not exists project_videos_upload_id_key
  on public.project_videos(upload_id)
  where upload_id is not null;

create unique index if not exists project_videos_asset_id_key
  on public.project_videos(asset_id)
  where asset_id is not null;

create index if not exists project_videos_status_idx
  on public.project_videos(status);

create table if not exists public.mux_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamp with time zone not null default now()
);

alter table public.mux_webhook_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mux_webhook_events'
      and policyname = 'No client access to mux webhook events'
  ) then
    create policy "No client access to mux webhook events"
      on public.mux_webhook_events
      for all
      to authenticated
      using (false)
      with check (false);
  end if;
end $$;
