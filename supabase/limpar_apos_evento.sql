-- =====================================================================
-- Quimia Arcade — LIMPAR DEPOIS DA FEIRA
-- Apaga contatos, partidas e ranking da nuvem (LGPD: não guarde contato além do necessário).
-- ANTES: exporte o CSV (painel do jogo > Nuvem > Exportar CSV) e guarde em 2 lugares.
-- Mantém as tabelas, as funções e o PIN, para uma próxima edição.
-- =====================================================================

-- 1) Confira o que vai ser apagado
select (select count(*) from public.plays)          as partidas,
       (select count(*) from public.contacts)       as contatos,
       (select count(*) from public.ranking_public) as linhas_ranking;

-- 2) Apague (rode só depois de exportar)
delete from public.contacts where true;
delete from public.plays where true;            -- em cascata, também esvazia ranking_public
update public.admin_config set failed_attempts = 0, locked_until = null where id = 1;

-- 3) Confirme que ficou tudo zerado
select (select count(*) from public.plays)          as partidas,
       (select count(*) from public.contacts)       as contatos,
       (select count(*) from public.ranking_public) as linhas_ranking;
