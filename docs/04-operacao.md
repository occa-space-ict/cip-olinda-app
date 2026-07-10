# Operação — Mapa Rizomático CIP Olinda

Guia de 1 página para operar a versão multiusuário. Público: admin OCCA.

## Infra provisionada

- **Supabase** (projeto `cip-olinda`, ref `tvnmvmkssotosiobtxfw`, região `sa-east-1`).
  - Tabelas: `nodes`, `links`, `project_members`. RLS ligada em todas.
  - Auth: magic link (e-mail, sem senha). Login restrito à allowlist `project_members`.
  - URL da API: `https://tvnmvmkssotosiobtxfw.supabase.co`
  - Publishable key (pública, protegida por RLS): `sb_publishable_QBb9E1XMQ4q3FPVin2UBcQ__C2LlP4t`
- **Vercel:** pendente de publicação (ver abaixo — precisa de permissão de criação de projeto na conta).

## Variáveis de ambiente (frontend)

Sem estas variáveis a app roda em **modo local** (localStorage, sem login). Com elas, entra em modo multiusuário:

```
VITE_SUPABASE_URL=https://tvnmvmkssotosiobtxfw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_QBb9E1XMQ4q3FPVin2UBcQ__C2LlP4t
```

Local: copie `.env.example` para `.env.local`. Na Vercel: defina as duas em Project Settings → Environment Variables.

## Publicar na Vercel

O deploy automático falhou por falta de permissão de criação de projeto no token conectado
(`403 forbidden: You don't have permission to create a project`). Publique manualmente:

1. `npm i -g vercel && vercel login`
2. Na raiz do projeto: `vercel --prod`
   - Framework detectado: Vite · Build: `npm run build` · Output: `dist`
3. Em Project Settings → Environment Variables, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Production).
4. Redeploy.

Após ter a URL pública (ex.: `https://cip-olinda.vercel.app`):

5. No painel Supabase → **Authentication → URL Configuration**, adicione a URL em **Site URL** e em **Redirect URLs** (senão o magic link não volta para a app). Inclua também `http://localhost:5173` para dev.

## Adicionar um membro da equipe

Supabase → **Table Editor → project_members → Insert**:
- `email`: e-mail exato de login
- `role`: `member` (ou `admin` para gerir allowlist/backup)

Ou via SQL: `insert into project_members(email,role) values ('pessoa@ex.com','member');`
Sem estar na allowlist, o login é barrado com mensagem clara. Admin atual: `occa.space@gmail.com`.

## Semear o mapa inicial

- **Pela app:** no 1º login de um admin com banco vazio, aparece um diálogo "Semear com o mapa inicial". Um clique popula 12 eixos + ramificações + conexões.
- **Por CLI:** `node scripts/seed-from-json.mjs > seed.sql` gera o SQL (idempotente) a partir do `SEED`; aplique no SQL Editor do Supabase. Passe um JSON exportado como argumento para semear a partir de um backup: `node scripts/seed-from-json.mjs meu-backup.json`.

## Backup e restauração

- **Backup:** botão `⇩ JSON` na toolbar baixa o estado completo. `⇩ .md geral` gera Markdown (Obsidian). Guardar em `CIP-OLINDA/00_GESTAO/`.
- **Restaurar:** botão `⇪ Importar` (substitui todo o estado, passando por `migrate()`). Ou `pg_dump` mensal pelo admin.
- **Encerramento (mês 3+):** export final JSON + .md arquivados no Drive; o projeto Supabase pode ser pausado.

## Comandos de desenvolvimento

```bash
npm run dev     # dev server (modo local se sem .env.local)
npm run build   # build estático em dist/
npm run test    # 38 testes unitários (funções puras)
```
