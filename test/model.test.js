import { describe, it, expect } from 'vitest';
import { precOf, N, slug, radius, drivePath, rootEixo, descRamos } from '../src/model.js';

describe('precOf', () => {
  it('conta checks true (0..4)', () => {
    expect(precOf({ checks: { abnt: false, dpi: false, aut: false, cur: false } })).toBe(0);
    expect(precOf({ checks: { abnt: true, dpi: true, aut: false, cur: false } })).toBe(2);
    expect(precOf({ checks: { abnt: true, dpi: true, aut: true, cur: true } })).toBe(4);
  });
  it('sem checks => 0', () => {
    expect(precOf({})).toBe(0);
  });
});

describe('N (fábrica de nó)', () => {
  it('defaults por tipo', () => {
    expect(N('cip', null, 'centro', 'CIP').relev).toBe(5);
    expect(N('e1', 'cip', 'eixo', 'Eixo').relev).toBe(4);
    expect(N('r', 'e1', 'ramo', 'Ramo').relev).toBe(2);
    const r = N('r', 'e1', 'ramo', 'Ramo');
    expect(r.status).toBe('planejado');
    expect(r.classe).toBe('previsto');
    expect(r.checks).toEqual({ abnt: false, dpi: false, aut: false, cur: false });
    expect(r.x).toBeNull();
  });
  it('extra sobrescreve defaults', () => {
    expect(N('r', 'e1', 'ramo', 'Ramo', '', { relev: 3, status: 'feito' }).relev).toBe(3);
  });
});

describe('slug', () => {
  it('remove acentos e normaliza', () => {
    expect(slug('Gênese: Paisagem')).toBe('genese-paisagem');
    expect(slug('  Álbum Olinda ')).toBe('album-olinda');
  });
});

describe('radius', () => {
  it('escala por tipo e relevância', () => {
    expect(radius({ tipo: 'centro', relev: 5 })).toBeCloseTo(26 * (0.65 + 0.18 * 5));
    expect(radius({ tipo: 'ramo', relev: 2 })).toBeCloseTo(8 * (0.65 + 0.18 * 2));
  });
});

describe('rootEixo / drivePath / descRamos', () => {
  const nodes = [
    N('cip', null, 'centro', 'CIP'),
    N('e2', 'cip', 'eixo', 'Eixo 2'),
    N('e2-a', 'e2', 'ramo', 'Ramo A'),
    N('e2-a-1', 'e2-a', 'ramo', 'Sub'),
    N('ent1', null, 'entidade', 'Fundaj'),
  ];
  it('rootEixo sobe até o eixo', () => {
    expect(rootEixo(nodes, 'e2-a-1')).toBe('e2');
    expect(rootEixo(nodes, 'e2')).toBe('e2');
  });
  it('drivePath por tipo', () => {
    expect(drivePath(nodes, nodes[0])).toBe('CIP-OLINDA/');
    expect(drivePath(nodes, nodes[4])).toBe('CIP-OLINDA/00_GESTAO/ENTIDADES/');
    expect(drivePath(nodes, nodes[2])).toBe('CIP-OLINDA/02_CASARAO-LUNDGREN/');
  });
  it('descRamos retorna todos os descendentes', () => {
    expect(descRamos(nodes, 'e2').map((n) => n.id)).toEqual(['e2-a', 'e2-a-1']);
  });
});
