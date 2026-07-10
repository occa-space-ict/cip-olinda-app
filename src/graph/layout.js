// Layout radial determinístico (sem física). Spec §3.1. Função pura sobre DB.nodes.
// Calcula x/y apenas para nós com x==null, salvo force=true.
import { byIdIn, kidsIn } from '../model.js';

export function layout(DB, force) {
  const nodes = DB.nodes;
  const R = [0, 275, 485, 655, 810];
  const byId = (id) => byIdIn(nodes, id);
  const kids = (id) => kidsIn(nodes, id);
  const leaf = (id) => {
    const c = kids(id);
    return c.length ? c.reduce((s, k) => s + leaf(k.id), 0) : 1;
  };
  (function place(id, a0, a1, d) {
    const n = byId(id);
    if (!n) return;
    const m = (a0 + a1) / 2;
    if (force || n.x == null) {
      n.x = Math.cos(m) * R[Math.min(d, 4)];
      n.y = Math.sin(m) * R[Math.min(d, 4)];
    }
    const c = kids(id);
    if (!c.length) return;
    const tot = c.reduce((s, k) => s + leaf(k.id), 0);
    let a = a0;
    c.forEach((k) => {
      const w = (a1 - a0) * leaf(k.id) / tot;
      place(k.id, a, a + w, d + 1);
      a += w;
    });
  })('cip', -Math.PI / 2, 1.5 * Math.PI, 0);
  // Nós sem pai (entidades) num anel de raio 150.
  nodes
    .filter((n) => !n.parent && n.id !== 'cip')
    .forEach((n, i) => {
      if (force || n.x == null) {
        const a = -Math.PI / 2 + i * 0.9;
        n.x = Math.cos(a) * 150;
        n.y = Math.sin(a) * 150;
      }
    });
}
