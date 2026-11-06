-- =====================================================================
-- Quimia Arcade — DESFAZER TUDO (remove as tabelas e funções do Quimia Arcade no Supabase)
-- CUIDADO: apaga TODAS as partidas e contatos guardados na nuvem. Exporte o CSV antes (painel do jogo > Nuvem).
-- Não remove a extensão pgcrypto (outras coisas podem usar). Pode rodar mais de uma vez.
-- =====================================================================

-- funções
drop function if exists public.submit_play(jsonb);
drop function if exists public.submit_contact(text, text, text, boolean, boolean);
drop function if exists public.get_ranking(text, date, int);
drop function if exists public.admin_set_pin(text, text);
drop function if exists public.admin_list(text, date);
drop function if exists public.admin_mark_delivered(text, text, boolean, text);
drop function if exists public.admin_delete_contact(text, text);
drop function if exists public.admin_delete_play(text, text);
drop function if exists public.admin_reset_day(text, date);
drop function if exists public.admin_reset_all(text);
drop function if exists public._admin_auth(text);

-- tabelas (a ordem importa por causa das chaves estrangeiras; sair do Realtime é automático ao apagar a tabela)
drop table if exists public.contacts cascade;
drop table if exists public.ranking_public cascade;
drop table if exists public.plays cascade;
drop table if exists public.admin_config cascade;
