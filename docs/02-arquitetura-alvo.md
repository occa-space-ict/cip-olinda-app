# Arquitetura Alvo — versão multiusuário leve

## 1. Requisitos norteadores

- ~5 usuários (equipe OCCA + curador); colaboração ocasional, não simultânea intensa
- Autenticação simplificada: sem cadastro aberto, sem gestão de senhas
- Banco de dados exclusivo do projeto (um único "documento" compartilhado)
- Arquivos grandes ficam no Google Drive como links — a app é **orquestrador administrativo**, nunca storage
- Custo ~zero (free tiers) e manutenção mínima após os 3 meses do projeto

## 2. Visão geral

```
[Browser: Vite + vanilla JS (SVG)]  ←→  [supabase-js]  ←→  [Supabase: Postgres + Auth + RLS (+ Realtime)]
        │
        └── links abrem →  [Google Drive: CIP-OLINDA/… (lotes de arquivos brutos)]
```

Frontend estático (Vercel). Sem servidor próprio: o supabase-js fala direto com o Postgres via PostgREST, protegido por RLS.

## 3. Banco de dados (Postgres/Supabase)

```sql
-- Membros autorizados (allowlist). Preenchida manualmente pelo admin.
create table project_members (
  email text primary key,
  role text not null default 'member' check (role in ('admin','member')),
  display_name text
);

create table nodes (
  id text primary key,
  parent text references nodes(id) on delete cascade,
  tipo text not null check (tipo in ('centro','eixo','ramo','entidade')),
  label text not null,
  "desc" text not null default '',
  status text not null default 'planejado'
    check (status in ('planejado','afazer','fazendo','feito')),
  checks jsonb not null default '{"abnt":false,"dpi":false,"aut":false,"cur":false}',
  relev int not null default 2 check (relev between 1 and 5),
  classe text not null default 'previsto' check (classe in ('previsto','naoprevisto')),
  drives jsonb not null default '[]',         -- [{label,url}]
  notes text not null default '',
  x double precision, y double precision,
  updated_at timestamptz not null default now(),
  updated_by text
);
-- prec é derivado; expor como coluna gerada para consultas/relatórios:
alter table nodes add column prec int generated always as (
  (checks->>'abnt')::boolean::int + (checks->>'dpi')::boolean::int +
  (checks->>'aut')::boolean::int + (checks->>'cur')::boolean::int ) stored;

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

-- RLS: só membros da allowlist leem/escrevem
alter table nodes enable row level security;
alter table links enable row level security;
alter table project_members enable row level security;

create policy member_read  on nodes for select using (auth.jwt()->>'email' in (select email from project_members));
create policy member_write on nodes for all    using (auth.jwt()->>'email' in (select email from project_members));
-- (idem para links; project_members: select para membros, escrita só role admin)
```

Notas:
- Um único projeto ⇒ sem tabela `projects`/`workspaces`. Se um dia houver outro projeto, replica-se a instância (decisão consciente de simplicidade).
- `updated_at/updated_by` via trigger `before update` — base do last-write-wins e de um log mínimo de auditoria.
- Trigger opcional de auditoria: tabela `changes(node_id, campo, valor_antigo, valor_novo, who, when)` — só se a equipe sentir falta.

## 4. Autenticação simplificada

- **Supabase Auth com magic link** (e-mail, sem senha). Tela de login = um campo de e-mail.
- Gate: após login, verificar `email ∈ project_members`; caso contrário, tela "peça acesso ao administrador".
- Admin (role `admin`): gerencia allowlist (insert em `project_members` via UI simples ou direto no dashboard Supabase) e pode restaurar backups.
- Alternativa descartada: senha única compartilhada — mais simples, porém sem identidade nas edições (`updated_by`) e revogação impossível. Magic link mantém a simplicidade sem esses custos.

## 5. Sincronização

- **Leitura:** carregar `nodes` + `links` no boot → estado em memória (mesma estrutura da spec §2.3).
- **Escrita:** cada ação do painel gera upsert pontual (nó ou link alterado), otimista; em erro, reverter e avisar.
- **Concorrência:** last-write-wins por linha via `updated_at`. Suficiente para 5 usuários; sem merge por campo.
- **Realtime (fase 3, opcional):** assinar `postgres_changes` de `nodes`/`links` e aplicar patches ao estado — colaboração ao vivo barata, sem refatorar nada (o render já é derivado do estado).
- **Posições (x,y):** debounce de ~1s ao arrastar para não spammar updates.
- **Offline:** fora de escopo; exigir conexão. O export JSON continua sendo o plano B.

## 6. Frontend

- Portar o arquivo de referência para módulos ES (estrutura no CLAUDE.md), trocando `localStorage` por `state.js` + `api.js`. As funções puras (layout, filtros/BFS, precOf, markdown) portam sem alteração.
- `migrate()` vira utilitário de **importação**: aceitar o JSON exportado do artefato (qualquer versão v1–v4) e semear o banco — é o caminho de migração dos dados atuais do usuário.
- Loading/erro: estados mínimos (spinner no boot, toast em falha de gravação, banner de reconexão).

## 7. Deploy & operação

- **Vercel:** build Vite, env `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- **Supabase:** projeto free tier; migrações versionadas (`supabase/migrations/`); backup semanal = export JSON automático? Não — manter manual (botão já existe) + `pg_dump` mensal do admin.
- **Domínio:** subdomínio simples (ex.: `cip.occa.space`).
- Encerramento do projeto (mês 3+): export final JSON + .md geral arquivados no Drive em `00_GESTAO/`; instância pode ser pausada.

## 8. Segurança & privacidade

- RLS em todas as tabelas; anon key só permite o que as policies deixam.
- Dados pessoais mínimos (e-mails da equipe; nomes de entidades/contatos nas notas — orientar a não colar dados sensíveis; LGPD: base legítima de execução contratual).
- Links de Drive controlam seu próprio acesso — a app não re-expõe conteúdo.

## 9. Decisões registradas (ADR resumido)

| # | Decisão | Motivo | Alternativa rejeitada |
|---|---|---|---|
| 1 | Supabase | Auth+DB+RLS prontos, free tier, sem backend próprio | Firebase (lock-in NoSQL não combina com modelo relacional/JSON híbrido); SQLite+servidor (exige hospedar backend) |
| 2 | Vanilla JS mantido | Paridade garantida, código pequeno e já testado em uso | React (reescrita cara sem ganho para 5 usuários) |
| 3 | Magic link + allowlist | Zero gestão de senha, identidade preservada | Senha compartilhada (sem autoria); OAuth Google (consentimento/verificação desnecessários) |
| 4 | Last-write-wins | Simplicidade; conflito improvável | CRDT/locks (complexidade desproporcional) |
| 5 | Drive por link manual | App é orquestrador, não DAM | API do Drive (OAuth, quotas e manutenção sem necessidade) |
