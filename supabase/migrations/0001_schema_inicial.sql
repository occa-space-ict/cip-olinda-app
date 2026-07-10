-- Schema inicial — Mapa Rizomático CIP Olinda (docs/02-arquitetura-alvo.md §3)
-- Aplicado no projeto Supabase cip-olinda (ref tvnmvmkssotosiobtxfw).

-- Membros autorizados (allowlist). Preenchida manualmente pelo admin.
create table project_members (
  email text primary key,
  role text not null default 'member' check (role in ('admin','member')),
  display_name text
);

create table nodes (
  id text primary key,
  -- FK deferrable permite inserir nós em lote sem ordenar pai-antes-de-filho.
  parent text references nodes(id) on delete cascade deferrable initially deferred,
  tipo text not null check (tipo in ('centro','eixo','ramo','entidade')),
  label text not null,
  "desc" text not null default '',
  status text not null default 'planejado'
    check (status in ('planejado','afazer','fazendo','feito')),
  checks jsonb not null default '{"abnt":false,"dpi":false,"aut":false,"cur":false}',
  relev int not null default 2 check (relev between 1 and 5),
  classe text not null default 'previsto' check (classe in ('previsto','naoprevisto')),
  drives jsonb not null default '[]',        -- [{label,url}]
  notes text not null default '',
  x double precision, y double precision,
  updated_at timestamptz not null default now(),
  updated_by text,
  -- prec é derivado do checklist (spec §11.1) — coluna gerada para relatórios.
  prec int generated always as (
    (checks->>'abnt')::boolean::int + (checks->>'dpi')::boolean::int +
    (checks->>'aut')::boolean::int + (checks->>'cur')::boolean::int ) stored
);

create table links (
  id bigint generated always as identity primary key,
  a text not null references nodes(id) on delete cascade,
  b text not null references nodes(id) on delete cascade,
  tipo text not null default 'direto' check (tipo in ('direto','indireto')),
  nota text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text,
  unique (a, b)
);

-- Trigger: base do last-write-wins; mantém updated_at coerente.
create or replace function touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger nodes_touch before update on nodes for each row execute function touch_updated_at();
create trigger links_touch before update on links for each row execute function touch_updated_at();

-- ---- RLS: só membros da allowlist leem/escrevem ----
alter table nodes enable row level security;
alter table links enable row level security;
alter table project_members enable row level security;

-- Helper SECURITY DEFINER (padrão Supabase p/ evitar recursão de RLS ao ler a allowlist).
create or replace function is_member() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where email = auth.jwt()->>'email');
$$;

create policy member_read  on nodes for select using (is_member());
create policy member_write on nodes for all    using (is_member()) with check (is_member());

create policy member_read_l  on links for select using (is_member());
create policy member_write_l on links for all    using (is_member()) with check (is_member());

-- Membro lê a própria linha (para o gate); admin gerencia toda a allowlist.
create policy pm_self_read on project_members for select
  using (email = auth.jwt()->>'email' or is_member());
create policy pm_admin_all on project_members for all
  using (exists (select 1 from project_members m where m.email = auth.jwt()->>'email' and m.role = 'admin'))
  with check (exists (select 1 from project_members m where m.email = auth.jwt()->>'email' and m.role = 'admin'));
