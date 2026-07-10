# Operação — Mapa Rizomático CIP Olinda

Guia de 1 página para operar a versão multiusuário. Público: admin OCCA.

## Infra provisionada

- **GitHub:** [github.com/occa-space-ict/cip-olinda-app](https://github.com/occa-space-ict/cip-olinda-app) (privado, conta `occa-space-ict`).
- **Supabase** (projeto `cip-olinda`, ref `tvnmvmkssotosiobtxfw`, região `sa-east-1`).
  - Tabelas: `nodes`, `links`, `project_members`. RLS ligada em todas.
  - Auth: magic link (e-mail, sem senha). Login restrito à allowlist `project_members`.
  - URL da API: `https://tvnmvmkssotosiobtxfw.supabase.co`
  - Publishable key (pública, protegida por RLS): `sb_publishable_QBb9E1XMQ4q3FPVin2UBcQ__C2LlP4t`
- **Vercel:** pendente de publicação (ver abaixo — o conector automático não tem permissão de criação de projeto; publicar manualmente via dashboard importando do GitHub).

## Variáveis de ambiente (frontend)

Sem estas variáveis a app roda em **modo local** (localStorage, sem login). Com elas, entra em modo multiusuário:

```
VITE_SUPABASE_URL=https://tvnmvmkssotosiobtxfw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_QBb9E1XMQ4q3FPVin2UBcQ__C2LlP4t
```

Local: copie `.env.example` para `.env.local`. Na Vercel: defina as duas em Project Settings → Environment Variables.

## Publicar na Vercel

O deploy automático via conector falhou por falta de permissão de criação de projeto
(`403 forbidden: You don't have permission to create a project`). Publique manualmente
pelo dashboard, importando direto do GitHub (recomendado — habilita auto-deploy a cada push):

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Selecione `occa-space-ict/cip-olinda-app` (autorize o GitHub App da Vercel se pedido)
3. Framework Preset: **Vite** (detectado automaticamente) · Build: `npm run build` · Output: `dist`
4. Em **Environment Variables**, adicione antes de clicar em Deploy:
   - `VITE_SUPABASE_URL` = `https://tvnmvmkssotosiobtxfw.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_QBb9E1XMQ4q3FPVin2UBcQ__C2LlP4t`
5. **Deploy**

Alternativa via CLI (`npm i -g vercel && vercel login && vercel --prod` na raiz do projeto) também funciona, mas exige repetir `vercel --prod` após configurar as env vars.

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
