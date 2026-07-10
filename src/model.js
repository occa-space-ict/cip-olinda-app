// Modelo de domínio: constantes, enums e helpers puros.
// Contrato: docs/01-especificacao-funcional.md §2. Não renomear campos/enums sem migração.

export const STATUS = {
  planejado: ['Planejado', '#94a3b8'],
  afazer: ['A fazer', '#f59e0b'],
  fazendo: ['Fazendo', '#3b82f6'],
  feito: ['Feito', '#10b981'],
};

export const CHECKS = {
  abnt: ['ABNT & fontes', 'Referências em norma ABNT; toda imagem com fonte indicada'],
  dpi: ['Padrão 300 DPI', 'Imagens mín. 1920×1080 px / 300 DPI (antigas re-escaneadas)'],
  aut: ['Autorizações', 'Termo de uso de imagem assinado para acervo particular'],
  cur: ['Curadoria', 'Conteúdo validado pelo curador master Plínio Victor'],
};

export const CLASSE = {
  previsto: 'Previsto (escopo original)',
  naoprevisto: 'Não previsto ✦ (potencialidade)',
};

export const DRIVEDIR = {
  e1: '01_MAPA-TURISTICO', e2: '02_CASARAO-LUNDGREN', e3: '03_PATRIMONIO-IMATERIAL',
  e4: '04_LINHA-DO-TEMPO', e5: '05_GENESE-PAISAGEM', e6: '06_TRACADO-URBANO',
  e7: '07_BONDE', e8: '08_ALOISIO-MAGALHAES', e9: '09_POSTAIS-SELOS',
  e10: '10_MIDIATECA', e11: '11_GASTRONOMIA-ARTE', e12: '12_MARACATU-NACAO-PE',
};

// prec é SEMPRE derivado dos checks (regra de negócio §11.1) — nunca gravado independente.
export const precOf = (n) => (n.checks ? Object.values(n.checks).filter(Boolean).length : 0);

// Fábrica de nó com defaults por tipo.
export function N(id, parent, tipo, label, desc, extra) {
  return Object.assign(
    {
      id, parent, tipo, label,
      desc: desc || '',
      status: 'planejado',
      prec: 0,
      checks: { abnt: false, dpi: false, aut: false, cur: false },
      relev: tipo === 'centro' ? 5 : tipo === 'eixo' ? 4 : 2,
      classe: 'previsto',
      drives: [],
      notes: '',
      x: null, y: null,
    },
    extra || {},
  );
}

export function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function slug(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function radius(n) {
  const base = { centro: 26, eixo: 14, transversal: 8, ramo: 8, entidade: 11 }[n.tipo] || 8;
  return base * (0.65 + 0.18 * (n.relev || 2));
}

// Helpers de grafo sobre um conjunto de nós (DB.nodes).
export const byIdIn = (nodes, id) => nodes.find((n) => n.id === id);
export const kidsIn = (nodes, id) => nodes.filter((n) => n.parent === id);

export function rootEixo(nodes, id) {
  let n = byIdIn(nodes, id);
  while (n && n.parent && n.parent !== 'cip') n = byIdIn(nodes, n.parent);
  return n && n.parent === 'cip' ? n.id : null;
}

export function drivePath(nodes, n) {
  if (n.tipo === 'centro') return 'CIP-OLINDA/';
  if (n.tipo === 'transversal') return 'CIP-OLINDA/00_GESTAO/';
  if (n.tipo === 'entidade' || (!n.parent && n.tipo !== 'centro')) return 'CIP-OLINDA/00_GESTAO/ENTIDADES/';
  const r = rootEixo(nodes, n.id);
  return 'CIP-OLINDA/' + (DRIVEDIR[r] || 'NOVOS') + '/';
}

export function descRamos(nodes, id) {
  const out = [];
  (function w(i) {
    kidsIn(nodes, i).forEach((k) => {
      out.push(k);
      w(k.id);
    });
  })(id);
  return out;
}
