import { describe, it, expect } from 'vitest';
import { matches, isFilteringF, computeDist } from '../src/graph/filters.js';
import { migrate } from '../src/migrate.js';
import { SEED } from '../src/seed.js';

const F = (o = {}) => ({ fstatus: new Set(), fprec: 0, fclasse: 'all', fsearch: '', ...o });

describe('matches', () => {
  const n = { tipo: 'ramo', status: 'fazendo', prec: 2, classe: 'previsto', label: 'Frevo', desc: 'história', notes: '' };
  it('centro sempre passa', () => {
    expect(matches({ tipo: 'centro' }, F({ fstatus: new Set(['feito']) }))).toBe(true);
  });
  it('filtro de status', () => {
    expect(matches(n, F({ fstatus: new Set(['fazendo']) }))).toBe(true);
    expect(matches(n, F({ fstatus: new Set(['feito']) }))).toBe(false);
  });
  it('precisão mínima', () => {
    expect(matches(n, F({ fprec: 2 }))).toBe(true);
    expect(matches(n, F({ fprec: 3 }))).toBe(false);
  });
  it('classe', () => {
    expect(matches(n, F({ fclasse: 'naoprevisto' }))).toBe(false);
    expect(matches(n, F({ fclasse: 'previsto' }))).toBe(true);
  });
  it('busca em label+desc+notes, case-insensitive', () => {
    expect(matches(n, F({ fsearch: 'frevo' }))).toBe(true);
    expect(matches(n, F({ fsearch: 'HISTÓRIA'.toLowerCase() }))).toBe(true);
    expect(matches(n, F({ fsearch: 'maracatu' }))).toBe(false);
  });
});

describe('isFilteringF', () => {
  it('detecta qualquer filtro ativo', () => {
    expect(isFilteringF(F())).toBe(false);
    expect(isFilteringF(F({ fprec: 1 }))).toBe(true);
    expect(isFilteringF(F({ fsearch: 'x' }))).toBe(true);
    expect(isFilteringF(F({ fstatus: new Set(['feito']) }))).toBe(true);
  });
});

describe('computeDist (BFS de camadas)', () => {
  const DB = migrate(structuredClone(SEED));
  // 'alvenaria' aparece só na descrição de e2-arq (não no eixo pai).
  it('d0 = só os filtrados; camada 1 não expande', () => {
    const f = F({ fsearch: 'alvenaria' });
    const dist = computeDist(DB, f, 1);
    expect(dist['e2-arq']).toBe(0);
    // com flayers=1 não expande para pai
    expect(dist['e2']).toBeUndefined();
  });
  it('camada 2 alcança o pai (mas nunca via centro)', () => {
    const f = F({ fsearch: 'alvenaria' });
    const dist = computeDist(DB, f, 2);
    expect(dist['e2']).toBe(1); // eixo pai
    expect(dist['cip']).toBeUndefined(); // centro nunca entra
  });
  it('entidade entra pela conexão, não pela hierarquia', () => {
    // cria entidade conectada a um ramo
    const db = migrate(structuredClone(SEED));
    db.nodes.push({ id: 'ent1', parent: null, tipo: 'entidade', label: 'Fundaj', desc: '', status: 'planejado', prec: 0, checks: {}, relev: 3, classe: 'previsto', drives: [], notes: '', x: null, y: null });
    db.links.push({ a: 'ent1', b: 'e3-frevo', tipo: 'direto', nota: '' });
    const dist = computeDist(db, F({ fsearch: 'frevo' }), 2);
    expect(dist['ent1']).toBe(1);
  });
});
