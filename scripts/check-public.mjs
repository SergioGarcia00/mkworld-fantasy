import {createClient} from '@supabase/supabase-js';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
for(const table of ['news_posts','matchdays','chat_messages']){const {error}=await db.from(table).select('id').limit(1);console.log(table,error?{code:error.code,message:error.message}:'ok')}
