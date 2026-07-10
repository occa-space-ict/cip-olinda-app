import { describe, it, expect } from 'vitest';
import { layout } from '../src/graph/layout.js';
import { migrate } from '../src/migrate.js';
import { SEED } from '../src/seed.js';

describe('layout radial', () => {
  it('centro fica em (0,0)', () => {
    const DB = migrate(structuredClone(SEED));
    layout(DB, true);
    const cip = DB.nodes.find((n) => n.id === 'cip');
    expect(cip.x).toBeCloseTo(0);
    expect(cip.y).toBeCloseTo(0);
  });
  it('eixos ficam no raio 275 (profundidade 1)', () => {
    const DB = migrate(structuredClone(SEED));
    layout(DB, true);
    const e1 = DB.nodes.find((n) => n.id === 'e1');
    const rad = Math.hypot(e1.x, e1.y);
    expect(rad).toBeCloseTo(275, 0);
  });
  it('só calcula posições de nós com x==null quando force=false', () => {
    const DB = migrate(structuredClone(SEED));
    const e1 = DB.nodes.find((n) => n.id === 'e1');
    e1.x = 999; e1.y = 888;
    layout(DB, false);
    expect(e1.x).toBe(999); // preservado
    const e2 = DB.nodes.find((n) => n.id === 'e2');
    expect(e2.x).not.toBeNull(); // recalculado (estava null)
  });
  it('entidade sem pai vai para o anel de raio 150', () => {
    const DB = migrate(structuredClone(SEED));
    DB.nodes.push({ id: 'ent1', parent: null, tipo: 'entidade', label: 'X', x: null, y: null, relev: 3, checks: {} });
    layout(DB, true);
    const ent = DB.nodes.find((n) => n.id === 'ent1');
    expect(Math.hypot(ent.x, ent.y)).toBeCloseTo(150, 0);
  });
});
