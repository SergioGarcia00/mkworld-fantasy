create table if not exists public.notifications (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,title text not null,body text not null,kind text not null default 'INFO',read_at timestamptz,created_at timestamptz not null default now());
alter table public.notifications enable row level security;
create policy notifications_owner on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create or replace function public.notify_all(title_text text,body_text text,kind_text text default 'INFO') returns integer language sql security definer set search_path='' as $$ insert into public.notifications(user_id,title,body,kind) select id,title_text,body_text,kind_text from public.profiles where access_enabled returning 1; $$;
revoke all on function public.notify_all(text,text,text) from public,anon,authenticated; grant execute on function public.notify_all(text,text,text) to service_role;
