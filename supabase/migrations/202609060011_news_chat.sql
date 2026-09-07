create table if not exists public.news_posts (id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 140),body text not null check(length(body) between 1 and 10000),category text not null default 'Competición',image_url text,published boolean not null default false,author_id uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.news_posts enable row level security;
create policy news_public on public.news_posts for select to anon,authenticated using (published=true or public.is_admin());
create table if not exists public.chat_messages (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,body text not null check(length(trim(body)) between 1 and 500),created_at timestamptz not null default now(),deleted_at timestamptz);
alter table public.chat_messages enable row level security;
create policy chat_read on public.chat_messages for select to authenticated using (deleted_at is null or public.is_admin());
create policy chat_insert on public.chat_messages for insert to authenticated with check(user_id=auth.uid());
create policy chat_admin_delete on public.chat_messages for update to authenticated using(public.is_admin()) with check(public.is_admin());
