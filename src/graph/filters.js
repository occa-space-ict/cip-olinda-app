// Filtros e BFS de camadas. Spec §4. Funções puras: recebem DB + filtros explícitos.
import { byIdIn, kidsIn } from '../model.js';

// filtros = { fstatus:Set, fprec:int, fclasse:string, fsearch:string }
export function matches(n, f) {
  if (n.tipo === 'centro') return true;
  if (f.fstatus.size && !f.fstatus.has(n.status)) return false;
  if (n.prec < f.fprec) return false;
  if (f.fclasse !== 'all' && n.classe !== f.fclasse) return false;
  if (f.fsearch) {
    const q = f.fsearch.toLowerCase();
    if (!(n.label + ' ' + n.desc + ' ' + (n.notes || '')).toLowerCase().includes(q)) return false;
  }
  return true;
}

export const isFilteringF = (f) =>
  !!(f.fstatus.size || f.fprec > 0 || f.fclasse !== 'all' || f.fsearch);

// BFS a partir dos elementos filtrados (exceto centro), atravessando pai↔filho
// (exceto via centro) e conexões cujo extremo é entidade. Expande até flayers-1.
export function computeDist(DB, f, flayers) {
  const nodes = DB.nodes;
  const byId = (id) => byIdIn(nodes, id);
  const kids = (id) => kidsIn(nodes, id);
  const dist = {};
  const q = [];
  nodes.forEach((n) => {
    if (n.tipo !== 'centro' && matches(n, f)) {
      dist[n.id] = 0;
      q.push(n.id);
    }
  });
  let i = 0;
  while (i < q.length) {
    const id = q[i++];
    const d = dist[id];
    if (d >= flayers - 1) continue;
    const n = byId(id);
    if (!n) continue;
    const nb = [];
    if (n.parent && n.parent !== 'cip') nb.push(n.parent);
    kids(id).forEach((k) => nb.push(k.id));
    // entidades se correlacionam pelas conexões
    DB.links.forEach((L) => {
      const A = byId(L.a), B = byId(L.b);
      if (!A || !B) return;
      if (L.a === id && (A.tipo === 'entidade' || B.tipo === 'entidade')) nb.push(L.b);
      if (L.b === id && (A.tipo === 'entidade' || B.tipo === 'entidade')) nb.push(L.a);
    });
    nb.forEach((m) => {
      if (dist[m] === undefined) {
        dist[m] = d + 1;
        q.push(m);
      }
    });
  }
  return dist;
}

export function wrap(t, w) {
  const words = t.split(' ');
  const lines = [''];
  words.forEach((x) => {
    if ((lines[lines.length - 1] + ' ' + x).trim().length > w) lines.push(x);
    else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + x).trim();
  });
  return lines.slice(0, 3);
}
