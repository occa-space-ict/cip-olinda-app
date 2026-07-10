// Render SVG do mapa radial + pan/zoom/drag. Spec §3. Porta da referência.
import { STATUS, radius } from '../model.js';
import { state, byId, kids, save, saveNode, ui } from '../state.js';
import { matches, isFilteringF, computeDist, wrap } from './filters.js';
import { linkNoteModal } from '../ui/modals.js';

const svgNS = 'http://www.w3.org/2000/svg';
let edgeEls = [], xEls = [], nodeEls = {};

function filters() {
  return { fstatus: state.fstatus, fprec: state.fprec, fclasse: state.fclasse, fsearch: state.fsearch };
}

export function renderGraph() {
  const svg = document.getElementById('svg');
  svg.innerHTML = '';
  const gEdges = document.createElementNS(svgNS, 'g'),
    gX = document.createElementNS(svgNS, 'g'),
    gNodes = document.createElementNS(svgNS, 'g');
  svg.appendChild(gEdges); svg.appendChild(gX); svg.appendChild(gNodes);
  edgeEls = []; xEls = []; nodeEls = {};
  const f = filters();
  const filt = isFilteringF(f);
  const dist = filt ? computeDist(state.DB, f, state.flayers) : null;
  const visOK = (n) => !filt || n.tipo === 'centro' || dist[n.id] !== undefined;
  const vcls = (n) => {
    if (!filt || n.tipo === 'centro') return '';
    const d = dist[n.id];
    if (d === 0) return '';
    if (d === 1) return ' lay1';
    if (d === 2) return ' lay2';
    return n.tipo === 'eixo' ? ' semi' : ' dim';
  };
  state.DB.nodes.forEach((n) => {
    if (n.parent && byId(n.parent)) {
      const l = document.createElementNS(svgNS, 'line');
      l.setAttribute('class', 'tedge' + ((visOK(n) && visOK(byId(n.parent))) ? '' : ' dim'));
      gEdges.appendChild(l);
      edgeEls.push({ el: l, a: n.parent, b: n.id });
    }
  });
  if (state.showConn)
    state.DB.links.forEach((L, i) => {
      const A = byId(L.a), B = byId(L.b);
      if (!A || !B) return;
      const p = document.createElementNS(svgNS, 'path');
      const hl = state.sel && (L.a === state.sel || L.b === state.sel) ? ' hl' : '';
      const df = (!visOK(A) || !visOK(B)) ? ' dimf' : '';
      p.setAttribute('class', 'xedge ' + L.tipo + hl + df);
      const tt = document.createElementNS(svgNS, 'title');
      tt.textContent = `${A.label} ⟷ ${B.label} (${L.tipo})` + (L.nota ? `\n📝 ${L.nota}` : '');
      p.appendChild(tt);
      p.addEventListener('click', (e) => { e.stopPropagation(); linkNoteModal(i); });
      gX.appendChild(p);
      xEls.push({ el: p, L });
    });
  state.DB.nodes.forEach((n) => {
    const g = document.createElementNS(svgNS, 'g');
    const r = radius(n);
    g.setAttribute('class', 'node' + vcls(n) + (state.sel === n.id ? ' sel' : ''));
    g.dataset.id = n.id;
    const fill = n.tipo === 'centro' ? '#1e293b' : STATUS[n.status][1];
    const st = {
      0: 'stroke:#94a3b8;stroke-width:1.4;stroke-dasharray:3 3',
      1: 'stroke:#94a3b8;stroke-width:1.6',
      2: 'stroke:#64748b;stroke-width:2',
      3: 'stroke:#334155;stroke-width:2.6',
      4: 'stroke:#b45309;stroke-width:3.4',
    }[n.prec || 0];
    let shape;
    if (n.tipo === 'entidade') {
      shape = document.createElementNS(svgNS, 'rect');
      shape.setAttribute('x', -r); shape.setAttribute('y', -r);
      shape.setAttribute('width', 2 * r); shape.setAttribute('height', 2 * r);
      shape.setAttribute('rx', 5);
      shape.setAttribute('style', 'fill:' + fill + ';' + st + ';stroke:var(--ent)' + (n.prec === 4 ? ';stroke:#b45309' : ''));
    } else {
      shape = document.createElementNS(svgNS, 'circle');
      shape.setAttribute('r', r);
      shape.setAttribute('style', 'fill:' + fill + ';' + st);
    }
    shape.setAttribute('class', 'shape');
    g.appendChild(shape);
    if (n.tipo === 'entidade') {
      const q = document.createElementNS(svgNS, 'text');
      q.setAttribute('text-anchor', 'middle'); q.setAttribute('y', 4);
      q.setAttribute('style', 'font-size:' + Math.round(r * 0.9) + 'px;fill:#fff;font-weight:700');
      q.textContent = '◈'; g.appendChild(q);
    }
    if (n.classe === 'naoprevisto') {
      const h = document.createElementNS(svgNS, 'circle');
      h.setAttribute('r', r + 5); h.setAttribute('class', 'halo'); g.appendChild(h);
    }
    if (n.drives && n.drives.length) {
      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('y', -r - 5);
      t.setAttribute('style', 'font-size:9px');
      t.textContent = '📁' + (n.drives.length > 1 ? n.drives.length : ''); g.appendChild(t);
    }
    const lines = wrap(n.label, n.tipo === 'eixo' ? 16 : 15);
    if (n.tipo === 'centro') {
      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('y', 4);
      t.setAttribute('style', 'font-size:12px;font-weight:700;fill:#fff');
      t.textContent = 'CIP'; g.appendChild(t);
    } else if (n.tipo === 'eixo' || n.tipo === 'transversal' || n.parent === 'cip') {
      lines.forEach((L, i) => {
        const t = document.createElementNS(svgNS, 'text');
        t.setAttribute('class', 'lbl'); t.setAttribute('text-anchor', 'middle');
        t.setAttribute('y', r + 11 + i * 10.5);
        if (n.tipo === 'eixo') t.setAttribute('style', 'font-weight:700;font-size:10.5px');
        t.textContent = L; g.appendChild(t);
      });
    } else {
      const right = (n.x || 0) >= 0;
      lines.forEach((L, i) => {
        const t = document.createElementNS(svgNS, 'text');
        t.setAttribute('class', 'lbl');
        t.setAttribute('text-anchor', right ? 'start' : 'end');
        t.setAttribute('x', right ? r + 5 : -r - 5);
        t.setAttribute('y', (i - (lines.length - 1) / 2) * 10.5 + 3);
        t.textContent = L; g.appendChild(t);
      });
    }
    gNodes.appendChild(g);
    nodeEls[n.id] = g;
  });
  svg.setAttribute('viewBox', `${state.vb.x} ${state.vb.y} ${state.vb.w} ${state.vb.h}`);
  updatePositions();
}

export function updatePositions() {
  for (const id in nodeEls) {
    const n = byId(id);
    if (n) nodeEls[id].setAttribute('transform', `translate(${n.x},${n.y})`);
  }
  edgeEls.forEach((e) => {
    const a = byId(e.a), b = byId(e.b);
    if (!a || !b) return;
    e.el.setAttribute('x1', a.x); e.el.setAttribute('y1', a.y);
    e.el.setAttribute('x2', b.x); e.el.setAttribute('y2', b.y);
  });
  xEls.forEach((x) => {
    const a = byId(x.L.a), b = byId(x.L.b);
    if (!a || !b) return;
    const cx = (a.x + b.x) / 2 * 0.35, cy = (a.y + b.y) / 2 * 0.35;
    x.el.setAttribute('d', `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`);
  });
}

// ---- pan / zoom / drag ----
let posTimer = null;
function debouncedSavePos(n) {
  // Debounce ~1s ao arrastar para não spammar updates (arquitetura §5).
  clearTimeout(posTimer);
  posTimer = setTimeout(() => saveNode(n), 1000);
}

export function initInteractions() {
  const svg = document.getElementById('svg');
  let pan = null, dragging = null, dragInfo = null;
  const svgPt = (e) => {
    const r = svg.getBoundingClientRect();
    return {
      x: state.vb.x + (e.clientX - r.left) / r.width * state.vb.w,
      y: state.vb.y + (e.clientY - r.top) / r.height * state.vb.h,
    };
  };
  svg.addEventListener('mousedown', (e) => {
    const g = e.target.closest('.node');
    if (g) {
      const n = byId(g.dataset.id);
      if (n && n.tipo !== 'centro') { dragging = n; dragInfo = { moved: 0 }; }
      else if (n) { dragInfo = { moved: 0, clickOnly: n.id }; }
      e.stopPropagation();
      return;
    }
    pan = { x: e.clientX, y: e.clientY, vx: state.vb.x, vy: state.vb.y };
    svg.classList.add('panning');
  });
  window.addEventListener('mousemove', (e) => {
    if (dragging) {
      const p = svgPt(e);
      dragging.x = p.x; dragging.y = p.y;
      dragInfo.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
      updatePositions();
      return;
    }
    if (!pan) return;
    const sc = state.vb.w / svg.clientWidth;
    state.vb.x = pan.vx - (e.clientX - pan.x) * sc;
    state.vb.y = pan.vy - (e.clientY - pan.y) * sc;
    svg.setAttribute('viewBox', `${state.vb.x} ${state.vb.y} ${state.vb.w} ${state.vb.h}`);
  });
  window.addEventListener('mouseup', () => {
    if (dragging) {
      if (dragInfo.moved < 5) ui.select(dragging.id);
      else debouncedSavePos(dragging);
      dragging = null; dragInfo = null;
      return;
    }
    if (dragInfo && dragInfo.clickOnly) { ui.select(dragInfo.clickOnly); dragInfo = null; return; }
    pan = null; svg.classList.remove('panning');
  });
  svg.addEventListener('click', (e) => {
    if (e.target === svg) {
      state.sel = null;
      document.getElementById('panel').classList.remove('open');
      ui.renderAll();
    }
  });
  svg.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.12 : 0.89, e); }, { passive: false });
}

export function zoom(f, e) {
  const svg = document.getElementById('svg');
  const r = svg.getBoundingClientRect();
  const mx = e ? state.vb.x + (e.clientX - r.left) / r.width * state.vb.w : state.vb.x + state.vb.w / 2;
  const my = e ? state.vb.y + (e.clientY - r.top) / r.height * state.vb.h : state.vb.y + state.vb.h / 2;
  state.vb = { x: mx - (mx - state.vb.x) * f, y: my - (my - state.vb.y) * f, w: state.vb.w * f, h: state.vb.h * f };
  svg.setAttribute('viewBox', `${state.vb.x} ${state.vb.y} ${state.vb.w} ${state.vb.h}`);
}

export function fit() {
  const svg = document.getElementById('svg');
  state.vb = { x: -820, y: -650, w: 1640, h: 1300 };
  svg.setAttribute('viewBox', `${state.vb.x} ${state.vb.y} ${state.vb.w} ${state.vb.h}`);
}
