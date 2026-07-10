# Especificação Funcional — Mapa Rizomático CIP Olinda (v4)

Fonte de verdade: `app/mapa-rizomatico-cip.html`. Esta spec descreve o comportamento que a versão multiusuário deve reproduzir.

## 1. Conceito

Grafo de gestão da pesquisa. Nós = elementos de pesquisa; arestas = hierarquia (pai→filho) e conexões rizomáticas (transversais, com anotação). O usuário acompanha progresso por status, qualidade por checklist de precisão, e importância por relevância. Arquivos brutos ficam no Google Drive, referenciados por links ("lotes").

## 2. Modelo de dados

### 2.1 Nó (`node`)

| Campo | Tipo | Valores / regras |
|---|---|---|
| `id` | string | único; seeds usam `e1…e12`, `eN-slug`; criados: `n<timestamp>`, `ent<timestamp>` |
| `parent` | string\|null | id do pai. `null` para `centro` e `entidade` |
| `tipo` | enum | `centro` (único, fixo) · `eixo` (12) · `ramo` · `entidade`. (`transversal` e `tag` são legados — ver §8) |
| `label` | string | título |
| `desc` | string | o que pesquisar |
| `status` | enum | `planejado` · `afazer` · `fazendo` · `feito` |
| `checks` | objeto | `{abnt, dpi, aut, cur}` booleanos — checklist de precisão |
| `prec` | int 0–4 | **derivado**: quantidade de `checks` true (`precOf`) |
| `relev` | int 1–5 | relevância; define o tamanho do nó |
| `classe` | enum | `previsto` (escopo original) · `naoprevisto` (potencialidade, marcador ✦) |
| `drives` | array | lotes `[{label, url}]` — múltiplos por nó |
| `notes` | string | markdown |
| `x`,`y` | float\|null | posição no mapa (persistida; `null` = recalcular) |

Checklist de precisão (rótulo — significado):
- `abnt` **ABNT & fontes** — referências em norma ABNT; toda imagem com fonte indicada
- `dpi` **Padrão 300 DPI** — imagens mín. 1920×1080 px / 300 DPI (antigas re-escaneadas)
- `aut` **Autorizações** — termo de uso de imagem assinado para acervo particular
- `cur` **Curadoria** — validado pelo curador master (Plínio Victor)

### 2.2 Conexão (`link`)

`{a, b, tipo, nota}` — `a`/`b` ids de nós; `tipo`: `direto` (forte, linha cheia) ou `indireto` (fraca, tracejada); `nota`: texto livre (por que os elementos se ligam; o que uma reunião alimentou).

### 2.3 Documento

`{v: 4, nodes: [], links: []}`. Na versão artefato, persiste em `localStorage` chave `cip-olinda-rizoma-v2` (conteúdo versionado pelo campo `v`).

### 2.4 Entidade — semântica

Pessoa, instituição, colecionador ou grupo (ex.: Fundaj, Plínio Victor, colecionador de postais). Sem eixo-pai; alimenta várias frentes simultaneamente via conexões. Uso típico: após uma reunião, atualizar notas da entidade e anotar nas conexões o que ela entregou a cada frente. Pode ter filhos (ex.: uma ata por reunião). Pasta Drive sugerida: `CIP-OLINDA/00_GESTAO/ENTIDADES/`.

## 3. Visão Mapa

### 3.1 Layout radial determinístico (sem física)

- Centro fixo em (0,0). Profundidade → raio: `[0, 275, 485, 655, 810]` (≥4 usa 810).
- Filhos dividem o setor angular do pai proporcionalmente à contagem de folhas; ângulo inicial −π/2, volta completa.
- Nós sem pai (entidades) em anel de raio 150, espaçados 0,9 rad.
- Posições calculadas **apenas** para nós com `x == null`; arrastar um nó persiste a posição. Botão ✺ zera todas as posições e redistribui.

### 3.2 Aparência do nó

- Raio base por tipo: centro 26 · eixo 14 · ramo 8 · entidade 11, multiplicado por `0.65 + 0.18 × relev`.
- Preenchimento = cor do status: planejado `#94a3b8` · a fazer `#f59e0b` · fazendo `#3b82f6` · feito `#10b981`. Centro `#1e293b`.
- Borda = precisão: P0 tracejada cinza · P1 fina cinza · P2 média · P3 escura · P4 dourada `#b45309` (3.4px).
- Entidade: quadrado arredondado teal (`--ent #0d9488`) com glifo ◈ branco.
- `classe == naoprevisto`: halo tracejado roxo (`#a855f7`).
- Com lotes de Drive: 📁 acima do nó (com contagem se >1).
- Rótulos: eixos/filhos do centro embaixo (negrito p/ eixo); ramos ancorados ao lado (start/end conforme lado); quebra em até 3 linhas de ~15 caracteres.

### 3.3 Arestas

- Hierarquia: linha reta cinza clara `#dbe3ec`.
- Conexão: curva quadrática (controle = ponto médio ×0.35 puxado ao centro), roxa `#c026d3`; `direto` cheia 2.2px/60%; `indireto` tracejada 1.2px/40%; destacada (100%, 3px) quando um extremo está selecionado.
- Clique na conexão → modal de anotação (§5.4). Tooltip nativo mostra `A ⟷ B (tipo)` + nota.

### 3.4 Interações

Pan (arrastar fundo), zoom (roda, centrado no cursor; botões +/−/⌂ enquadrar), drag de nó (movimento <5px = clique/seleção), clique no fundo deseleciona e fecha painel.

## 4. Filtros (barra superior)

- **Status:** chips multi-seleção (Planejado/A fazer/Fazendo/Feito) + "Todos".
- **Precisão:** select mínimo — todas / ≥P1 / ≥P2 / ≥P3 / P4 completo.
- **Classe:** todas / previstos / não previstos ✦.
- **Busca:** substring case-insensitive em `label + desc + notes`.
- **Conexões:** checkbox liga/desliga a renderização das arestas roxas.
- **Camadas** (slider 1–3), ativo só quando há filtro:
  - BFS a partir de todos os nós que casam com o filtro (exceto `centro`), atravessando: pai↔filho (exceto via centro) **e** conexões cujo extremo é entidade. Expande até distância `camadas−1`.
  - Opacidades: d0 = 100% · d1 = 90% (`lay1`) · d2 = 80% (`lay2`) · fora: eixo 10% (`semi`), demais 5% (`dim`).
  - Arestas de hierarquia fora das camadas: 10%; conexões com extremo oculto: 8%.
  - Rótulo do slider: "só filtrados" / "+ camada direta" / "+ camada distante".
- `matches(n)`: `centro` sempre passa; demais avaliam status ∈ seleção, `prec ≥ mínimo`, classe e busca.

## 5. Painel de edição (lateral direita, abre ao clicar em nó)

1. Badge de status colorido; badge ◈ Entidade quando aplicável; ✦ quando não previsto; botões `⇩ .md` (ficha do nó) e ✕.
2. Breadcrumb da hierarquia (`CIP Olinda › Eixo › …`).
3. Campos: Título · Descrição · Status (select) · Relevância R1–R5 (select) · Classe (select).
4. **Checklist de precisão** — 4 checkboxes com rótulo e explicação; cabeçalho mostra `P{n}/4` (+★ se 4). Marcar/desmarcar recalcula `prec` na hora.
5. **Lotes no Google Drive** — linhas `{nome, url}` com abrir 📁 e remover ✕; botão `+ lote`; exibe pasta sugerida (`drivePath`, ver §7).
6. **Notas (markdown)** — textarea monoespaçada redimensionável + botão `⤢ Editor` (modal grande: toolbar B/I/H1/H2/lista/link, preview ao vivo, `⇩ baixar .md`, salvar/cancelar).
7. **Conexões** — cartão por conexão: nome do outro nó (clique navega), toggle `━ direta`/`╌ indireta`, 📝 abre modal da anotação, ✕ remove; nota exibida em itálico. Adicionar: select "+ conectar a…" + select de tipo.
8. Ações: `+ Ramificação filha` (abre modal de novo elemento com pai pré-selecionado) · `Excluir` (apenas `ramo` e `entidade`; confirma; remove descendentes e conexões).

### 5.4 Modal de anotação de conexão
Mostra o par e o tipo; textarea da nota; botão alternar direta/indireta; salvar/cancelar. Acessível pelo painel (📝) e pelo clique na linha no mapa.

## 6. Visão Lista (toggle ☰/🌿)

- Um cartão por grupo: cada **eixo**, cada **entidade** e cada ramo solto (filho direto do centro).
- Cabeçalho: dot de status (entidade com contorno teal e ◈), título, contador `feitos/total` (entidade: nº de conexões), barra de progresso (% de descendentes `feito`).
- Linhas (descendentes que passam nos filtros): dot de status · título · **badge P com gradação** (P0 cinza tracejado → P1–P3 âmbares → P4 dourado texto branco) · **badge R com gradação** (R1 cinza → R2–R4 índigos → R5 índigo sólido texto branco) · ✦ quando não previsto · ↳ quando aninhado fundo · 📁 link do primeiro lote (com contagem). Tooltips explicativos.
- Clique em qualquer linha/cabeçalho abre o painel. Grupos sem itens visíveis somem quando há filtro ativo.

## 7. Google Drive (orquestração de arquivos)

Estrutura canônica: `CIP-OLINDA/` com `00_GESTAO/` (+ `ENTIDADES/`) e `01…12_<EIXO>` (mapa `DRIVEDIR`); dentro de cada eixo: `BRUTO/`, `IMAGENS-ALTA/`, `TEXTOS/`, `VALIDADO/`. `drivePath(n)` sugere a pasta pelo eixo-raiz do nó; novos eixos caem em `NOVOS/`. A app nunca acessa a API do Drive — só guarda e abre links.

## 8. Migrações de dados (`migrate()`)

Aceita qualquer versão anterior e normaliza para v4:
- v1: `links` como pares `[a,b]` → `{a,b,tipo:'direto',nota:''}`; `drive` string → `drives:[{label:'Lote principal',url}]`.
- v2: remove resíduos de física (`vx`,`vy`,`_a`); `tag` → `ramo` com `parent:'cip'` (remove `#` do label).
- v3→v4: nós `transversal` são **removidos** (viraram o checklist); links órfãos limpos; `prec` antigo → checks (`P≥2→abnt`, `P≥3→+dpi`, `P4→todos`); `prec` recalculado; posições zeradas uma vez (`v:4`).
- Campos ausentes ganham defaults (`relev` por tipo, `classe:'previsto'`, `notes:''`, `checks` vazio).

## 9. Import / Export

- **⇩ JSON**: documento completo (backup/transferência). **⇪ Importar**: JSON passa por `migrate()` antes de aplicar.
- **⇩ .md geral**: todos os grupos e descendentes concatenados com separadores.
- **⇩ .md por nó** (painel): frontmatter-like com status, `P{n}/4`, relevância, classe, pasta sugerida; seções Checklist (`- [x]/- [ ]`), Descrição, Notas, Conexões (`[[label]] (tipo) — nota`, compatível Obsidian), Lotes (links).
- **↺**: restaura o seed original (com confirmação).

## 10. Indicadores (header)

Total de ramos · a fazer · fazendo · feitos · ★ P4 · ✦ não previstos.

## 11. Regras de negócio

1. `prec` sempre derivado do checklist; P4 exige os 4 critérios (inclui validação do curador).
2. Convenção do projeto: elemento só deveria ir a `feito` com P4 (não bloqueado por software — decisão de processo; ver perguntas 9–10 do questionário).
3. Elementos novos criados durante a pesquisa nascem `classe: naoprevisto` por default (potencialidades identificáveis).
4. Eixos e centro não são excluíveis pela UI.
5. Hierarquia de profundidade arbitrária é permitida.

## 12. Seed

12 eixos + ~50 ramificações extraídas da apresentação da proposta (02/07/2026), 10 conexões com 3 notas de exemplo, eixos de risco (2,5,7,8,9) já em `afazer` com nota de prioridade mês 1.
