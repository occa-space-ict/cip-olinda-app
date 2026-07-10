// Visão em lista (toggle ☰/🌿). Spec §6. Badges P e R gradados.
import { STATUS, esc } from '../model.js';
import { state, descRamos, ui } from '../state.js';
import { matches } from '../graph/filters.js';

const PBADGE = {
  0: ['#f8fafc', '#94a3b8', '1px dashed #cbd5e1'],
  1: ['#fef9c3', '#a16207', '1px solid #fde68a'],
  2: ['#fde68a', '#92400e', '1px solid #fcd34d'],
  3: ['#f59e0b', '#78350f', '1px solid #d97706'],
  4: ['#b45309', '#ffffff', '1px solid #92400e'],
};
const RBADGE = {
  1: ['#f8fafc', '#94a3b8', '1px solid #e2e8f0'],
  2: ['#e0e7ff', '#6366f1', '1px solid #c7d2fe'],
  3: ['#c7d2fe', '#4338ca', '1px solid #a5b4fc'],
  4: ['#818cf8', '#1e1b4b', '1px solid #6366f1'],
  5: ['#4f46e5', '#ffffff', '1px solid #4338ca'],
};
const pBadge = (n) => {
  const c = PBADGE[n.prec || 0];
  return `<span class="prec" style="background:${c[0]};color:${c[1]};border:${c[2]};font-weight:600" title="Precisão: ${n.prec}/4 critérios do checklist">P${n.prec}</span>`;
};
const rBadge = (n) => {
  const c = RBADGE[n.relev || 2];
  return `<span class="prec" style="background:${c[0]};color:${c[1]};border:${c[2]};font-weight:600" title="Relevância: ${n.relev}/5">R${n.relev}</span>`;
};

export function renderList() {
  const el = document.getElementById('list');
  const f = { fstatus: state.fstatus, fprec: state.fprec, fclasse: state.fclasse, fsearch: state.fsearch };
  let h = '';
  const groups = state.DB.nodes.filter((n) => n.tipo === 'eixo' || n.tipo === 'transversal');
  const soltos = state.DB.nodes.filter((n) => (n.tipo === 'ramo' && (n.parent === 'cip' || !n.parent)) || n.tipo === 'entidade');
  const renderGrp = (x, ds) => {
    const all = [x, ...ds].filter((n) => matches(n, f));
    if ((state.fstatus.size || state.fprec > 1 || state.fsearch || state.fclasse !== 'all') && !all.length) return '';
    const done = ds.filter((n) => n.status === 'feito').length;
    const pct = ds.length ? Math.round(done / ds.length * 100) : (x.status === 'feito' ? 100 : 0);
    let g = `<div class="exgrp"><div class="exhead" data-id="${x.id}"><span class="dot" style="background:${STATUS[x.status][1]}${x.tipo === 'entidade' ? ';border-radius:2px;outline:2px solid var(--ent)' : ''}"></span><h3>${x.tipo === 'entidade' ? '<span style="color:var(--ent)">◈</span> ' : ''}${esc(x.label)}${x.classe === 'naoprevisto' ? ' <span class="np">✦</span>' : ''}</h3>${x.tipo === 'entidade' ? `<span class="hint">${state.DB.links.filter((L) => L.a === x.id || L.b === x.id).length} conexões</span>` : `<span class="hint">${done}/${ds.length} feitos</span>`}<div class="pbar"><i style="width:${pct}%"></i></div></div>`;
    ds.forEach((n) => {
      if (!matches(n, f)) return;
      const d1 = n.drives && n.drives[0];
      g += `<div class="row" data-id="${n.id}"><span class="dot" style="background:${STATUS[n.status][1]}"></span>${esc(n.label)}${pBadge(n)}${rBadge(n)}${n.classe === 'naoprevisto' ? '<span class="np">✦ não previsto</span>' : ''}${n.parent !== x.id ? '<span class="hint">↳</span>' : ''}${d1 && d1.url ? `<a class="drv" href="${esc(d1.url)}" target="_blank" onclick="event.stopPropagation()">📁${n.drives.length > 1 ? n.drives.length : ''}</a>` : '<span class="drv" style="opacity:.25">📁</span>'}</div>`;
    });
    return g + '</div>';
  };
  groups.forEach((x) => { h += renderGrp(x, descRamos(x.id)); });
  soltos.forEach((x) => { h += renderGrp(x, descRamos(x.id)); });
  el.innerHTML = h || '<p class="hint">Nenhum elemento corresponde aos filtros.</p>';
  el.querySelectorAll('[data-id]').forEach((r) => r.addEventListener('click', () => ui.select(r.dataset.id)));
}
