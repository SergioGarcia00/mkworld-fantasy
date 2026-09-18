-- RLS policies do not grant table privileges. Participants need insert access
-- for the chat form; anonymous visitors still only get the spectator RPC.
grant insert on public.chat_messages to authenticated;
grant update on public.chat_messages to authenticated;
