-- =====================================================================
-- Quimia Arcade — VERIFICAÇÃO DE SEGURANÇA
-- Rode no SQL Editor (New query → Run) DEPOIS do schema. Mostra uma tabela: toda linha precisa ter ok = true.
-- Cada teste "vira" o papel anon (o mesmo que o navegador do visitante usa) e tenta algo.
-- Ele cria e apaga uma partida de teste (id começando com "verif-") e, no teste 18, gasta as tentativas de PIN
-- (o admin da nuvem fica bloqueado por 60 s; no fim o script desbloqueia).
-- Rode ANTES o BLOCO 5 do schema (definir o PIN): sem PIN definido o teste 23 não consegue mostrar o bloqueio.
-- =====================================================================

create temp table if not exists _verif (
  n serial, teste text, esperado text, resultado text, ok boolean
);
truncate _verif;

-- Roda p_sql como anon.
--   esperado 'erro'   → o comando TEM que falhar
--   esperado 'ok'     → o comando TEM que funcionar
--   esperado 'valor=X'→ a 1ª coluna do resultado tem que ser X
create or replace function pg_temp.vf(p_teste text, p_esperado text, p_sql text)
returns void
language plpgsql
as $$
declare
  v_val text;
  v_err text;
  v_ok  boolean;
  v_res text;
begin
  begin
    execute 'set local role anon';
    if p_esperado like 'valor=%' then
      execute p_sql into v_val;   -- só consultas que devolvem uma linha usam INTO
    else
      execute p_sql;
    end if;
  exception when others then
    v_err := sqlerrm;
  end;
  execute 'reset role';

  if p_esperado = 'erro' then
    v_ok := v_err is not null;
    v_res := coalesce('erro: ' || v_err, 'executou SEM erro (ruim)');
  elsif p_esperado = 'ok' then
    v_ok := v_err is null;
    v_res := coalesce('erro: ' || v_err, 'executou sem erro');
  else
    v_ok := v_err is null and v_val is not distinct from substr(p_esperado, 7);
    v_res := coalesce('erro: ' || v_err, 'valor=' || coalesce(v_val, 'NULL'));
  end if;
  insert into _verif (teste, esperado, resultado, ok) values (p_teste, p_esperado, v_res, v_ok);
end;
$$;

-- ---- O visitante (anon) NÃO pode ler nem mexer nas tabelas privadas ----
select pg_temp.vf('01 anon NÃO lê plays',          'erro', 'select count(*)::text from public.plays');
select pg_temp.vf('02 anon NÃO lê contacts',       'erro', 'select count(*)::text from public.contacts');
select pg_temp.vf('03 anon NÃO lê admin_config',   'erro', 'select count(*)::text from public.admin_config');
select pg_temp.vf('04 anon NÃO insere em plays',   'erro', $q$insert into public.plays (id, nick, game, points, quimia) values ('verif-x','A','bolha',1,1)$q$);
select pg_temp.vf('05 anon NÃO insere em contacts','erro', $q$insert into public.contacts (play_id, contact, consent) values ('verif-x','x',true)$q$);

-- ---- ranking_public: só leitura ----
select pg_temp.vf('06 anon LÊ ranking_public',               'ok',   'select count(*)::text from public.ranking_public');
select pg_temp.vf('07 anon NÃO insere em ranking_public',    'erro', $q$insert into public.ranking_public (id, nick, game, points, quimia, day, played_at) values ('verif-y','A','bolha',1,1,current_date,now())$q$);
select pg_temp.vf('08 anon NÃO altera ranking_public',       'erro', $q$update public.ranking_public set points = 999$q$);
select pg_temp.vf('09 anon NÃO apaga ranking_public',        'erro', 'delete from public.ranking_public');

-- ---- submit_play valida os dados ----
select pg_temp.vf('10 submit_play com points = -5 falha',    'erro', $q$select public.submit_play('{"id":"verif-bad1","nick":"Teste","game":"bolha","points":-5,"quimia":0}'::jsonb)::text$q$);
select pg_temp.vf('11 submit_play com jogo inválido falha',  'erro', $q$select public.submit_play('{"id":"verif-bad2","nick":"Teste","game":"xadrez","points":5,"quimia":0}'::jsonb)::text$q$);
select pg_temp.vf('12 submit_play com apelido vazio falha',  'erro', $q$select public.submit_play('{"id":"verif-bad3","nick":"","game":"bolha","points":5,"quimia":0}'::jsonb)::text$q$);
select pg_temp.vf('13 submit_play válido grava',             'valor=true',  $q$select (public.submit_play('{"id":"verif-1","nick":"VerifTeste","game":"bolha","points":20,"quimia":667,"duration_ms":30000,"official":true,"rankable":true,"code":"ZZ99","station_id":"VF"}'::jsonb)->>'inserted')$q$);
select pg_temp.vf('14 reenviar o MESMO id não duplica',      'valor=false', $q$select (public.submit_play('{"id":"verif-1","nick":"VerifTeste","game":"bolha","points":20,"quimia":667,"duration_ms":30000,"official":true,"rankable":true,"code":"ZZ99","station_id":"VF"}'::jsonb)->>'inserted')$q$);
select pg_temp.vf('15 partida aparece no ranking público',   'valor=1', $q$select count(*)::text from public.ranking_public where id = 'verif-1'$q$);
select pg_temp.vf('16 get_ranking devolve a partida',        'valor=1', $q$select count(*)::text from public.get_ranking('bolha', null, 200) where id = 'verif-1'$q$);

-- ---- contatos: só com consentimento ----
select pg_temp.vf('17 contato SEM consentimento é recusado', 'valor=sem_consentimento', $q$select public.submit_contact('verif-1','@x','instagram',false,false)->>'error'$q$);
select pg_temp.vf('18 contato COM consentimento grava',      'valor=true', $q$select public.submit_contact('verif-1','@verif.teste','instagram',false,true)->>'ok'$q$);
select pg_temp.vf('19 contato de partida inexistente',       'valor=sem_partida', $q$select public.submit_contact('verif-naoexiste','@x','instagram',false,true)->>'error'$q$);

-- ---- admin: PIN errado nunca entrega dados ----
select pg_temp.vf('20 admin_list com PIN errado é negado',   'valor=acesso_negado', $q$select public.admin_list('000000')->>'error'$q$);
select pg_temp.vf('21 admin_reset_all com PIN errado negado','valor=acesso_negado', $q$select public.admin_reset_all('000000')->>'error'$q$);
select pg_temp.vf('22 anon não define o PIN sem o antigo',   'valor=acesso_negado', $q$select public.admin_set_pin('654321', null)->>'error'$q$);

-- ---- 5 erros de PIN bloqueiam por 60 s (conferido como dono da base) ----
do $$
begin
  perform public.admin_list('000001');
  perform public.admin_list('000002');
  perform public.admin_list('000003');
  perform public.admin_list('000004');
  perform public.admin_list('000005');
end $$;
insert into _verif (teste, esperado, resultado, ok)
select '23 5 erros de PIN bloqueiam por 60 s', 'locked_until no futuro',
       coalesce(locked_until::text, 'NULL'), coalesce(locked_until > now(), false)
  from public.admin_config where id = 1;

-- ---- limpeza: apaga a partida de teste e desbloqueia o admin ----
delete from public.plays where id like 'verif-%';
update public.admin_config set failed_attempts = 0, locked_until = null where id = 1;

-- RESULTADO: toda linha precisa estar com ok = true
select n, teste, esperado, resultado, ok from _verif order by n;
