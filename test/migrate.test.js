import { describe, it, expect } from 'vitest';
import { migrate } from '../src/migrate.js';
import { SEED } from '../src/seed.js';

describe('migrate v1 → v4', () => {
  it('links como pares [a,b] viram objetos', () => {
    const d = migrate({ v: 1, nodes: [{ id: 'a', tipo: 'ramo', label: 'A', parent: 'cip' }, { id: 'b', tipo: 'ramo', label: 'B', parent: 'cip' }], links: [['a', 'b']] });
    expect(d.links[0]).toEqual({ a: 'a', b: 'b', tipo: 'direto', nota: '' });
  });
  it('drive string vira drives[{label,url}]', () => {
    const d = migrate({ v: 1, nodes: [{ id: 'a', tipo: 'ramo', label: 'A', parent: 'cip', drive: 'http://x' }] });
    expect(d.nodes[0].drives).toEqual([{ label: 'Lote principal', url: 'http://x' }]);
    expect(d.nodes[0].drive).toBeUndefined();
  });
  it('tag vira ramo, remove # do label, parent cip', () => {
    const d = migrate({ v: 2, nodes: [{ id: 't', tipo: 'tag', label: '# Selos' }] });
    expect(d.nodes[0].tipo).toBe('ramo');
    expect(d.nodes[0].label).toBe('Selos');
    expect(d.nodes[0].parent).toBe('cip');
  });
  it('transversais são removidos e seus links limpos', () => {
    const d = migrate({ v: 3, nodes: [{ id: 'tv', tipo: 'transversal', label: 'X' }, { id: 'a', tipo: 'ramo', label: 'A', parent: 'cip' }], links: [{ a: 'tv', b: 'a', tipo: 'direto', nota: '' }] });
    expect(d.nodes.find((n) => n.id === 'tv')).toBeUndefined();
    expect(d.links.length).toBe(0);
  });
  it('prec antigo vira checks e prec recalculado', () => {
    const d = migrate({ v: 3, nodes: [{ id: 'a', tipo: 'ramo', label: 'A', parent: 'cip', prec: 3 }] });
    expect(d.nodes[0].checks).toEqual({ abnt: true, dpi: true, aut: false, cur: false });
    expect(d.nodes[0].prec).toBe(2);
  });
  it('remove resíduos de física', () => {
    const d = migrate({ v: 2, nodes: [{ id: 'a', tipo: 'ramo', label: 'A', parent: 'cip', vx: 1, vy: 2, _a: 3 }] });
    expect(d.nodes[0].vx).toBeUndefined();
    expect(d.nodes[0]._a).toBeUndefined();
  });
  it('zera posições ao migrar de versão anterior', () => {
    const d = migrate({ v: 2, nodes: [{ id: 'a', tipo: 'ramo', label: 'A', parent: 'cip', x: 10, y: 20 }] });
    expect(d.nodes[0].x).toBeNull();
    expect(d.v).toBe(4);
  });
  it('null/sem nodes retorna null', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate({})).toBeNull();
  });
  it('SEED v4 passa sem perder nós nem zerar (já é v4)', () => {
    const d = migrate(structuredClone(SEED));
    expect(d.nodes.length).toBe(SEED.nodes.length);
    expect(d.v).toBe(4);
  });
});
