// Migração de dados v1→v4 (spec §8). Porta idêntica da referência.
// Também é o caminho de importação de JSON exportado do artefato.
import { precOf } from './model.js';

export function migrate(d) {
  if (!d || !d.nodes) return null;
  // transversais viram checklist de precisão
  const tv = d.nodes.filter((n) => n.tipo === 'transversal').map((n) => n.id);
  d.nodes = d.nodes.filter((n) => n.tipo !== 'transversal');
  d.nodes.forEach((n) => {
    if (n.tipo === 'tag') {
      n.tipo = 'ramo';
      if (!n.parent) n.parent = 'cip';
      n.label = n.label.replace(/^#\s*/, '');
    }
    if (n.relev == null) n.relev = n.tipo === 'centro' ? 5 : n.tipo === 'eixo' ? 4 : 2;
    if (!n.classe) n.classe = 'previsto';
    if (!n.drives) n.drives = n.drive ? [{ label: 'Lote principal', url: n.drive }] : [];
    delete n.drive;
    if (n.notes == null) n.notes = '';
    if (!n.checks) {
      const p = n.prec || 0;
      n.checks = { abnt: p >= 2, dpi: p >= 3, aut: p >= 4, cur: p >= 4 };
    }
    n.prec = precOf(n);
    if (n.x === undefined) n.x = null;
    if (n.y === undefined) n.y = null;
    delete n.vx;
    delete n.vy;
    delete n._a;
  });
  d.links = (d.links || [])
    .map((L) => (Array.isArray(L) ? { a: L[0], b: L[1], tipo: 'direto', nota: '' } : Object.assign({ nota: '' }, L)))
    .filter((L) => !tv.includes(L.a) && !tv.includes(L.b));
  if (d.v !== 4) {
    d.nodes.forEach((n) => {
      n.x = null;
      n.y = null;
    });
    d.v = 4;
  } // relayout ao migrar
  return d;
}
