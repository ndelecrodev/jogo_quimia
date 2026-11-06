-- =====================================================================
-- Quimia Arcade — schema do Supabase (camada opcional de sincronização)
-- Pode rodar mais de uma vez sem erro (idempotente).
-- Cole um BLOCO por vez no SQL Editor → New query → Run, NA ORDEM (1 a 5).
-- Quem é quem:
--   plays          PRIVADA  (partidas completas: código, prêmios, estação)
--   contacts       PRIVADA  (contatos de quem aceitou a LGPD)
--   ranking_public PÚBLICA  (só leitura: apelido, pontos, jogo; sem código/contato)
--   admin_config   PRIVADA  (hash do PIN e controle de tentativas)
-- O navegador (chave "anon") só consegue: ler ranking_public e chamar as funções abaixo.
-- =====================================================================


-- =====================================================================
-- BLOCO 1 — Extensão e tabelas
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.plays (
  id           text primary key,
  nick         text        not null,
  game         text        not null,
  points       int         not null,
  quimia       int         not null,
  duration_ms  int         not null default 0,
  played_at    timestamptz not null default now(),
  day          date        not null default current_date,
  official     boolean     not null default false,
  rankable     boolean     not null default true,   -- entra no ranking? (fez o mínimo do jogo)
  attempt_no   int,
  code         text,
  prizes       jsonb       not null default '[]'::jsonb,
  delivered    boolean     not null default false,
  delivered_at timestamptz,
  station_id   text,
  created_at   timestamptz not null default now(),
  -- NOTA: o apelido tem até 13 caracteres (e não 10) porque o modo anônimo gera "Visitante-123".
  constraint plays_game_chk   check (game in ('bolha','misturar','sobe','runner')),
  constraint plays_points_chk check (points between 0 and 100000),
  constraint plays_nick_chk   check (char_length(nick) between 1 and 13),
  constraint plays_quimia_chk check (quimia >= 0)
);

-- NOTA: o código de resgate tem só 4 caracteres e cada estação os gera sozinha, então dois códigos iguais podem
-- existir (em estações diferentes). Por isso NÃO há UNIQUE no código: uma restrição dessas faria o banco recusar uma
-- partida legítima. Se acontecer, admin_mark_delivered avisa ("codigo_duplicado") e o painel marca pela linha da lista.
create index if not exists plays_code_idx on public.plays (code) where code is not null;
create index if not exists plays_day_idx on public.plays (day);

create table if not exists public.contacts (
  play_id      text primary key references public.plays(id) on delete cascade,
  contact      text        not null,
  contact_type text,
  company      boolean     not null default false,
  consent      boolean     not null,
  created_at   timestamptz not null default now(),
  constraint contacts_consent_chk check (consent = true),
  constraint contacts_len_chk     check (char_length(contact) between 1 and 80)
);

create table if not exists public.ranking_public (
  id          text primary key references public.plays(id) on delete cascade,
  nick        text        not null,
  game        text        not null,
  points      int         not null,
  quimia      int         not null,
  duration_ms int         not null default 0,   -- necessário para o desempate (menor tempo vence)
  day         date        not null,
  played_at   timestamptz not null,
  official    boolean     not null default false
);
create index if not exists ranking_public_game_idx on public.ranking_public (game, official);

create table if not exists public.admin_config (
  id              int primary key default 1,
  pin_hash        text,
  failed_attempts int  not null default 0,
  locked_until    timestamptz,
  constraint admin_config_single check (id = 1)
);
insert into public.admin_config (id) values (1) on conflict (id) do nothing;


-- =====================================================================
-- BLOCO 2 — Segurança (RLS) e Realtime
-- =====================================================================
alter table public.plays          enable row level security;
alter table public.contacts       enable row level security;
alter table public.ranking_public enable row level security;
alter table public.admin_config   enable row level security;

-- nada de acesso direto às tabelas privadas (sem policy = negado)
revoke all on table public.plays, public.contacts, public.admin_config from public, anon, authenticated;
revoke all on table public.ranking_public from public, anon, authenticated;

-- ranking_public: o visitante só pode LER
drop policy if exists ranking_public_select_anon on public.ranking_public;
create policy ranking_public_select_anon on public.ranking_public
  for select to anon using (true);
grant select on table public.ranking_public to anon;

-- Realtime: avisar a TV quando o ranking mudar
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ranking_public') then
    alter publication supabase_realtime add table public.ranking_public;
  end if;
end $$;


-- =====================================================================
-- BLOCO 3 — Funções públicas (o jogo chama estas; todas validam os dados)
-- =====================================================================

-- Recebe uma partida. Idempotente: reenviar o mesmo id não duplica.
create or replace function public.submit_play(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id       text;
  v_nick     text;
  v_game     text;
  v_points   int;
  v_quimia   int;
  v_dur      int;
  v_played   timestamptz;
  v_day      date;
  v_official boolean;
  v_rankable boolean;
  v_attempt  int;
  v_code     text;
  v_prizes   jsonb;
  v_station  text;
  v_max      int;
  v_inserted int;
begin
  if p is null or jsonb_typeof(p) <> 'object' or length(p::text) > 4000 then
    raise exception 'dados invalidos' using errcode = '22023';
  end if;

  v_id       := nullif(btrim(p->>'id'), '');
  v_nick     := btrim(coalesce(p->>'nick', ''));
  v_game     := p->>'game';
  v_points   := (p->>'points')::int;
  v_quimia   := coalesce((p->>'quimia')::int, 0);
  v_dur      := coalesce((p->>'duration_ms')::int, 0);
  v_played   := coalesce((p->>'played_at')::timestamptz, now());
  v_day      := coalesce((p->>'day')::date, (v_played at time zone 'America/Sao_Paulo')::date);
  v_official := coalesce((p->>'official')::boolean, false);
  v_rankable := coalesce((p->>'rankable')::boolean, true);
  v_attempt  := (p->>'attempt_no')::int;
  v_code     := nullif(upper(btrim(coalesce(p->>'code', ''))), '');
  v_prizes   := coalesce(p->'prizes', '[]'::jsonb);
  v_station  := nullif(btrim(coalesce(p->>'station_id', '')), '');

  if v_id is null or char_length(v_id) > 40 then
    raise exception 'id invalido' using errcode = '22023';
  end if;
  if char_length(v_nick) not between 1 and 13 then
    raise exception 'apelido invalido' using errcode = '22023';
  end if;
  if v_game is null or v_game not in ('bolha','misturar','sobe','runner') then
    raise exception 'jogo invalido' using errcode = '22023';
  end if;
  -- teto de plausibilidade por jogo (bem acima do que uma pessoa faz em 120 s)
  v_max := case v_game when 'bolha' then 600 when 'misturar' then 1000 else 20000 end;
  if v_points is null or v_points < 0 or v_points > v_max then
    raise exception 'pontuacao invalida' using errcode = '22023';
  end if;
  if v_quimia < 0 or v_quimia > 10000000 then
    raise exception 'pontuacao quimia invalida' using errcode = '22023';
  end if;
  if v_dur < 0 or v_dur > 600000 then
    raise exception 'duracao invalida' using errcode = '22023';
  end if;
  if v_code is not null and v_code !~ '^[A-Z0-9]{4}$' then
    raise exception 'codigo invalido' using errcode = '22023';
  end if;
  if v_station is not null and char_length(v_station) > 12 then
    raise exception 'estacao invalida' using errcode = '22023';
  end if;
  if jsonb_typeof(v_prizes) <> 'array' then
    raise exception 'premios invalidos' using errcode = '22023';
  end if;
  if v_played > now() + interval '1 day' then
    v_played := now();   -- relógio da estação adiantado
  end if;

  insert into public.plays
    (id, nick, game, points, quimia, duration_ms, played_at, day, official, rankable, attempt_no, code, prizes, station_id)
  values
    (v_id, v_nick, v_game, v_points, v_quimia, v_dur, v_played, v_day, v_official, v_rankable, v_attempt, v_code, v_prizes, v_station)
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;

  -- só entra no ranking público quem fez pontos e atingiu o mínimo do jogo
  if v_points > 0 and v_rankable then
    insert into public.ranking_public (id, nick, game, points, quimia, duration_ms, day, played_at, official)
    values (v_id, v_nick, v_game, v_points, v_quimia, v_dur, v_day, v_played, v_official)
    on conflict (id) do nothing;
  end if;

  return jsonb_build_object('ok', true, 'inserted', v_inserted > 0);
end;
$$;

-- Recebe o contato de uma partida. Só grava com consentimento (LGPD) e só uma vez por partida
-- (não deixa ninguém sobrescrever o contato de outra pessoa).
create or replace function public.submit_contact(
  p_play_id text, p_contact text, p_type text, p_company boolean, p_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_contact text := btrim(coalesce(p_contact, ''));
  v_type    text := left(btrim(coalesce(p_type, '')), 20);
begin
  if p_consent is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'sem_consentimento');
  end if;
  if char_length(v_contact) not between 1 and 80 then
    raise exception 'contato invalido' using errcode = '22023';
  end if;
  if not exists (select 1 from public.plays where id = p_play_id) then
    return jsonb_build_object('ok', false, 'error', 'sem_partida');   -- a partida ainda não chegou: o jogo tenta de novo
  end if;

  insert into public.contacts (play_id, contact, contact_type, company, consent)
  values (p_play_id, v_contact, nullif(v_type, ''), coalesce(p_company, false), true)
  on conflict (play_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

-- Lê o ranking. p_game nulo = Ranking Geral (por Pontuação Quimia); senão, ranking do jogo (por pontos).
-- No máximo 1 melhor partida por apelido; só partidas oficiais.
-- Desempate: maior pontuação, depois menor duração, depois quem fez primeiro.
create or replace function public.get_ranking(
  p_game text default null, p_day date default null, p_limit int default 50
)
returns table (
  id text, nick text, game text, points int, quimia int,
  duration_ms int, day date, played_at timestamptz, official boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if p_game is null then
    return query
      select b.id, b.nick, b.game, b.points, b.quimia, b.duration_ms, b.day, b.played_at, b.official
        from (
          select distinct on (lower(r.nick)) r.id, r.nick, r.game, r.points, r.quimia, r.duration_ms, r.day, r.played_at, r.official
            from public.ranking_public r
           where r.official and (p_day is null or r.day = p_day)
           order by lower(r.nick), r.quimia desc, r.duration_ms asc, r.played_at asc
        ) b
       order by b.quimia desc, b.duration_ms asc, b.played_at asc
       limit v_limit;
  else
    return query
      select b.id, b.nick, b.game, b.points, b.quimia, b.duration_ms, b.day, b.played_at, b.official
        from (
          select distinct on (lower(r.nick)) r.id, r.nick, r.game, r.points, r.quimia, r.duration_ms, r.day, r.played_at, r.official
            from public.ranking_public r
           where r.official and r.game = p_game and (p_day is null or r.day = p_day)
           order by lower(r.nick), r.points desc, r.duration_ms asc, r.played_at asc
        ) b
       order by b.points desc, b.duration_ms asc, b.played_at asc
       limit v_limit;
  end if;
end;
$$;

revoke all on function public.submit_play(jsonb) from public;
revoke all on function public.submit_contact(text, text, text, boolean, boolean) from public;
revoke all on function public.get_ranking(text, date, int) from public;
grant execute on function public.submit_play(jsonb) to anon, authenticated;
grant execute on function public.submit_contact(text, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.get_ranking(text, date, int) to anon, authenticated;


-- =====================================================================
-- BLOCO 4 — Funções de admin (o PIN é conferido AQUI no servidor)
-- Todas devolvem jsonb {"ok": true/false, ...}. Erro de PIN = "acesso_negado" (sempre a mesma resposta,
-- exista PIN ou não). 5 erros seguidos bloqueiam por 60 segundos.
-- (Não usam "raise" no erro de PIN de propósito: um erro desfaria a contagem de tentativas.)
-- =====================================================================

-- Uso interno: confere o PIN e controla as tentativas. Ninguém de fora executa.
create or replace function public._admin_auth(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v public.admin_config%rowtype;
begin
  select * into v from public.admin_config where id = 1 for update;
  if not found or v.pin_hash is null then
    return false;
  end if;
  if v.locked_until is not null and v.locked_until > now() then
    return false;
  end if;
  if p_pin is not null and v.pin_hash = crypt(p_pin, v.pin_hash) then
    update public.admin_config set failed_attempts = 0, locked_until = null where id = 1;
    return true;
  end if;
  update public.admin_config
     set failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
         locked_until    = case when failed_attempts + 1 >= 5 then now() + interval '60 seconds' else locked_until end
   where id = 1;
  return false;
end;
$$;
revoke all on function public._admin_auth(text) from public, anon, authenticated;

-- Define ou troca o PIN (mínimo 6 dígitos). A PRIMEIRA definição só vale pelo SQL Editor (não pelo navegador);
-- para trocar, é preciso o PIN antigo.
create or replace function public.admin_set_pin(p_new text, p_old text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_hash text;
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if p_new is null or p_new !~ '^[0-9]{6,}$' then
    return jsonb_build_object('ok', false, 'error', 'pin_invalido');
  end if;
  select pin_hash into v_hash from public.admin_config where id = 1;
  if v_hash is null then
    if v_role in ('anon', 'authenticated') then
      return jsonb_build_object('ok', false, 'error', 'acesso_negado');
    end if;
  else
    if not public._admin_auth(p_old) then
      return jsonb_build_object('ok', false, 'error', 'acesso_negado');
    end if;
  end if;
  update public.admin_config
     set pin_hash = crypt(p_new, gen_salt('bf')), failed_attempts = 0, locked_until = null
   where id = 1;
  return jsonb_build_object('ok', true);
end;
$$;

-- Lista partidas + contatos (para o painel e o CSV).
create or replace function public.admin_list(p_pin text, p_day date default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public._admin_auth(p_pin) then
    return jsonb_build_object('ok', false, 'error', 'acesso_negado');
  end if;
  return jsonb_build_object('ok', true, 'data', coalesce((
    select jsonb_agg(to_jsonb(t) order by t.played_at desc)
      from (
        select pl.id, pl.nick, pl.game, pl.points, pl.quimia, pl.duration_ms, pl.played_at, pl.day,
               pl.official, pl.rankable, pl.attempt_no, pl.code, pl.prizes, pl.delivered, pl.delivered_at,
               pl.station_id, c.contact, c.contact_type, c.company, c.consent
          from public.plays pl
          left join public.contacts c on c.play_id = pl.id
         where p_day is null or pl.day = p_day
      ) t
  ), '[]'::jsonb));
end;
$$;

-- Marca (ou desmarca) o brinde como entregue, pelo código de resgate.
create or replace function public.admin_mark_delivered(
  p_pin text, p_code text, p_delivered boolean default true, p_station text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_n    int;
begin
  if not public._admin_auth(p_pin) then
    return jsonb_build_object('ok', false, 'error', 'acesso_negado');
  end if;
  select count(*) into v_n from public.plays
   where code = v_code and (p_station is null or station_id = p_station);
  if v_n = 0 then
    return jsonb_build_object('ok', false, 'error', 'codigo_nao_encontrado');
  end if;
  if v_n > 1 then
    return jsonb_build_object('ok', false, 'error', 'codigo_duplicado',
      'estacoes', (select jsonb_agg(station_id) from public.plays where code = v_code));
  end if;
  update public.plays
     set delivered = coalesce(p_delivered, true),
         delivered_at = case when coalesce(p_delivered, true) then now() else null end
   where code = v_code and (p_station is null or station_id = p_station);
  return jsonb_build_object('ok', true, 'updated', 1);
end;
$$;

-- LGPD: apaga só o contato de uma partida.
create or replace function public.admin_delete_contact(p_pin text, p_play_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_n int;
begin
  if not public._admin_auth(p_pin) then
    return jsonb_build_object('ok', false, 'error', 'acesso_negado');
  end if;
  delete from public.contacts where play_id = p_play_id;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_n);
end;
$$;

-- LGPD: apaga a partida inteira (e, em cascata, o contato e a linha do ranking público).
create or replace function public.admin_delete_play(p_pin text, p_play_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_n int;
begin
  if not public._admin_auth(p_pin) then
    return jsonb_build_object('ok', false, 'error', 'acesso_negado');
  end if;
  delete from public.plays where id = p_play_id;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_n);
end;
$$;

-- Zera um dia (partidas, contatos e ranking daquele dia).
create or replace function public.admin_reset_day(p_pin text, p_day date)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_n int;
begin
  if not public._admin_auth(p_pin) then
    return jsonb_build_object('ok', false, 'error', 'acesso_negado');
  end if;
  if p_day is null then
    return jsonb_build_object('ok', false, 'error', 'dia_invalido');
  end if;
  delete from public.plays where day = p_day;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_n);
end;
$$;

-- Zera TUDO (para abrir a feira). Apaga partidas, contatos e ranking. Não mexe no PIN.
create or replace function public.admin_reset_all(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_n int;
begin
  if not public._admin_auth(p_pin) then
    return jsonb_build_object('ok', false, 'error', 'acesso_negado');
  end if;
  delete from public.plays where true;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_n);
end;
$$;

revoke all on function public.admin_set_pin(text, text) from public;
revoke all on function public.admin_list(text, date) from public;
revoke all on function public.admin_mark_delivered(text, text, boolean, text) from public;
revoke all on function public.admin_delete_contact(text, text) from public;
revoke all on function public.admin_delete_play(text, text) from public;
revoke all on function public.admin_reset_day(text, date) from public;
revoke all on function public.admin_reset_all(text) from public;
grant execute on function public.admin_set_pin(text, text) to anon, authenticated;
grant execute on function public.admin_list(text, date) to anon, authenticated;
grant execute on function public.admin_mark_delivered(text, text, boolean, text) to anon, authenticated;
grant execute on function public.admin_delete_contact(text, text) to anon, authenticated;
grant execute on function public.admin_delete_play(text, text) to anon, authenticated;
grant execute on function public.admin_reset_day(text, date) to anon, authenticated;
grant execute on function public.admin_reset_all(text) to anon, authenticated;


-- =====================================================================
-- BLOCO 5 — Defina o PIN de admin da nuvem (rode UMA vez; troque 123456 pelo SEU PIN, mínimo 6 DÍGITOS)
-- Anote o PIN só com a equipe. Para trocar depois, use o painel do jogo (Nuvem > Trocar PIN) ou rode de novo
-- este bloco (aqui no SQL Editor funciona sempre).
-- =====================================================================
-- >>> TROQUE O 123456 ANTES DE RODAR <<<
update public.admin_config
   set pin_hash = crypt('123456', gen_salt('bf')), failed_attempts = 0, locked_until = null
 where id = 1;
-- (Alternativa equivalente:  select public.admin_set_pin('123456');  — só funciona se ainda não houver PIN.)
