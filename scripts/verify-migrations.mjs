import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
const db=new PGlite();
await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',raw_app_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;`);
for(const name of (await readdir('supabase/migrations')).sort()){await db.exec(await readFile('supabase/migrations/'+name,'utf8'));console.log(name+' OK');}
await db.exec("insert into news_posts(title,body,published) values('Publicada','Visible',true),('Borrador','Oculto',false);set role anon;");
const rows=await db.query('select title from news_posts');if(rows.rows.length!==1||rows.rows[0].title!=='Publicada')throw Error('Public news RLS failed');
await db.query('select * from spectator_chat()');console.log('Anonymous news filters drafts; chat RPC callable.');await db.close();
