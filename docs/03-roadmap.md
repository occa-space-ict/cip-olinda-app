# Roadmap — do artefato ao orquestrador multiusuário

Fases pensadas para sessões de trabalho no Claude Code. Cada fase termina com critérios de aceite verificáveis; não iniciar a seguinte sem fechá-los.

## Fase 0 — Extração e paridade local (1 sessão)

Migrar `app/mapa-rizomatico-cip.html` para projeto Vite com módulos ES (estrutura do CLAUDE.md), mantendo `localStorage` como persistência temporária.

**Aceite:**
- `npm run dev` abre a app idêntica à referência (checklist manual da spec §3–§10)
- Funções puras extraídas (`layout`, `filters`, `precOf`, `markdown`, `migrate`) com testes unitários passando (`npm run test`)
- Import do JSON exportado do artefato reproduz o estado

## Fase 1 — Backend e auth (1–2 sessões)

Criar projeto Supabase, aplicar schema (`docs/02` §3), configurar RLS e magic link + allowlist.

**Aceite:**
- Login por magic link funciona; e-mail fora da allowlist é barrado com mensagem clara
- Seed do banco a partir do JSON v4 via script (`scripts/seed-from-json.mjs`)
- Policies testadas: membro lê/escreve; não-membro nada

## Fase 2 — CRUD sincronizado (1–2 sessões)

Trocar `localStorage` por `api.js` (supabase-js): load no boot, upserts pontuais, last-write-wins, debounce de posições, toasts de erro.

**Aceite:**
- Duas sessões (navegadores) editando: alterações de uma aparecem na outra após reload
- Excluir nó com descendentes remove cascata e conexões (verificar FK cascade)
- Export JSON/.md continua funcionando (agora a partir do estado do banco)
- `updated_by` registra o autor da última edição, visível no painel ("editado por X, quando")

## Fase 3 — Colaboração leve (1 sessão, opcional)

Realtime: assinar mudanças e aplicar patches sem reload; indicador discreto de "quem está online".

**Aceite:**
- Edição em uma sessão reflete na outra em <2s sem reload
- Sem flicker/perda de seleção no painel durante patches remotos

## Fase 4 — Operação e relatórios (1 sessão)

- Painel de progresso para o cliente: % feito e % P4 por eixo (dados já existem; render simples)
- Página admin mínima: gerenciar allowlist, botão de export de backup
- Deploy Vercel + domínio; documento de operação (1 página: como adicionar membro, como fazer backup, como restaurar)

**Aceite:**
- URL pública funcional com login; relatório por eixo visível; backup baixável pelo admin

## Integrações futuras (backlog, sem compromisso)

- Skill `relatorio-pesquisa-cip-olindax` (já existente no Cowork): gerar o "patch" da reunião num JSON aplicável via importação parcial
- Importação parcial/merge de JSON (hoje o import substitui tudo)
- Log de auditoria por campo (tabela `changes`)
- Modo somente-leitura por link para o cliente (Ezio Déda) sem entrar na allowlist de edição
