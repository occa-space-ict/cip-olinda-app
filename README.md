# Mapa Rizomático — CIP Olinda

Orquestrador administrativo da pesquisa de conteúdos do **Centro de Interpretação do Patrimônio de Olinda** (Casarão Hermann Lundgren). Projeto executado pela **OCCA — Olinda Creative Community Action**, com curadoria de Plínio Victor, prazo de 3 meses e 12 eixos temáticos de pesquisa.

## O que é

Um grafo interativo (mapa rizomático) que gerencia o **estado** da pesquisa — não os arquivos. Cada nó é um elemento de pesquisa (eixo, ramificação ou entidade) com status, checklist de precisão, relevância, classe, notas em markdown e links para lotes de arquivos brutos no Google Drive. Os arquivos grandes vivem **exclusivamente no Drive**; a aplicação só orquestra metadados, conexões e progresso.

## Estado atual

`app/mapa-rizomatico-cip.html` — aplicação completa em **um único arquivo HTML** (vanilla JS, sem dependências), persistindo em `localStorage`. Funciona aberta direto no navegador. É a referência funcional: tudo que ela faz deve continuar funcionando após a migração.

## Objetivo desta fase

Transformar o arquivo único em aplicação **multiusuário leve**:

- Poucos usuários (equipe OCCA + curador), autenticação simplificada por allowlist
- Banco de dados pequeno, exclusivo do projeto
- Arquivos grandes permanecem como links de Drive (a app nunca armazena binários)
- Apenas orquestração administrativa — sem ambição de DAM, CMS ou editor de conteúdo final

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `CLAUDE.md` | Instruções de trabalho para o Claude Code |
| `docs/01-especificacao-funcional.md` | Spec completa do comportamento atual (modelo de dados, filtros, visões, exports) |
| `docs/02-arquitetura-alvo.md` | Arquitetura da versão multiusuário (schema SQL, auth, sync, deploy) |
| `docs/03-roadmap.md` | Fases de desenvolvimento com critérios de aceite |
| `app/mapa-rizomatico-cip.html` | Código-fonte de referência (versão artefato, v4) |

## Contexto de domínio (resumo)

12 eixos: 1 Mapa Turístico · 2 Casarão Lundgren · 3 Patrimônio Imaterial · 4 Linha do Tempo · 5 Gênese/Paisagem · 6 Traçado Urbano · 7 Bonde · 8 Aloísio Magalhães · 9 Postais e Selos · 10 Midiateca · 11 Gastronomia & Arte · 12 Maracatu Nação PE. Critérios de precisão por elemento: ABNT & fontes, Padrão 300 DPI, Autorizações de imagem, validação de Curadoria.
