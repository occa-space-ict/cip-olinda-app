# CLAUDE.md — Mapa Rizomático CIP Olinda

## O que este projeto é

Orquestrador administrativo (multiusuário leve) da pesquisa do Centro de Interpretação do Patrimônio de Olinda. A referência funcional completa está em `app/mapa-rizomatico-cip.html` (arquivo único, vanilla JS + localStorage). A missão é migrá-lo para a arquitetura descrita em `docs/02-arquitetura-alvo.md` **sem perder nenhum comportamento** descrito em `docs/01-especificacao-funcional.md`.

## Princípios inegociáveis

1. **A app não armazena arquivos.** Fotos, scans e documentos grandes vivem no Google Drive; a app guarda apenas `{label, url}` dos lotes. Nunca implementar upload de binários.
2. **Paridade funcional primeiro.** Nenhuma feature da versão single-file pode regredir: filtros (status/precisão/classe/busca/camadas), mapa radial com drag, lista com badges gradados, painel de edição, conexões com tipo e nota, entidades, editor markdown, exports .json/.md.
3. **Modelo de dados é contrato.** Os campos e enums da spec (§2) não mudam de nome nem de semântica sem atualizar a spec e escrever migração. `prec` é sempre **derivado** de `checks` — nunca gravado de forma independente.
4. **Simplicidade proporcional.** Equipe de ~5 usuários e 3 meses de projeto: nada de microserviços, filas, cache distribuído. Uma tabela a menos vale mais que uma abstração a mais.
5. **Export é backup.** O usuário deve sempre conseguir baixar o estado completo em JSON e em Markdown (compatível com Obsidian, `[[wikilinks]]`).

## Stack alvo (decidida)

- **Backend/BD/Auth:** Supabase (Postgres + Auth por magic link + RLS). Schema em `docs/02-arquitetura-alvo.md` §3.
- **Frontend:** manter vanilla JS do arquivo de referência, reorganizado em módulos ES com Vite. **Não** reescrever em React — o código SVG atual funciona e a equipe é pequena.
- **Deploy:** Vercel (frontend estático) + Supabase hosted.
- **Auth simplificada:** magic link por e-mail, restrito a uma allowlist (`project_members`). Sem cadastro aberto, sem senha, sem roles complexos (apenas `admin` e `member`).

## Estrutura de código esperada

```
src/
  main.js            # bootstrap, auth gate
  state.js           # estado em memória + sync (substitui localStorage direto)
  api.js             # camada supabase-js (CRUD nodes/links, realtime)
  graph/
    layout.js        # layout radial determinístico (portar de referência)
    render.js        # SVG render + pan/zoom/drag
    filters.js       # matches(), computeDist() (camadas BFS)
  ui/
    panel.js         # painel de edição do nó
    list.js          # visão em lista
    modals.js        # novo elemento, entidade, nota de conexão, confirm
    markdown.js      # mini-renderer + editor
  export.js          # JSON/MD por nó e geral
```

## Comandos

```bash
npm run dev        # Vite dev server
npm run build      # build estático
npm run test       # vitest (unidades puras: layout, filtros, precOf, md renderer, migrações)
npx supabase db push   # aplicar migrações locais (se CLI configurada)
```

## Convenções

- PT-BR em toda a UI e nos comentários voltados a domínio; código em inglês é aceitável para identificadores genéricos.
- Funções puras (layout, BFS de camadas, precOf, renderer markdown) devem ter teste unitário — são o núcleo do comportamento e são fáceis de quebrar silenciosamente.
- Migrations SQL versionadas em `supabase/migrations/`. A migração de dados localStorage→banco usa o mesmo `migrate()` da referência (v1→v4) antes de subir.
- Last-write-wins com `updated_at`; sem locks. Conflito real é improvável com 5 usuários e edição por painel.

## Armadilhas conhecidas (aprendidas na versão artefato)

- `prompt()/confirm()/alert()` são bloqueados em iframes sandboxed — a referência já usa modais próprios; manter.
- O nó `centro` não participa da BFS de camadas (senão tudo fica a 1 salto de tudo).
- Entidades (`tipo='entidade'`, sem `parent`) entram na BFS **pelas conexões**, não pela hierarquia.
- O mini-renderer markdown escapa HTML antes de aplicar regras — nunca inverter a ordem (XSS).
- Backtick dentro de template literals no HTML de referência: cuidado ao editar strings do painel.

## Fora de escopo (não implementar sem pedido explícito)

Upload de arquivos, versionamento de conteúdo, comentários por nó, notificações, mobile app, integração automática com API do Drive (links colados manualmente bastam), i18n.
