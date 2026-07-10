// Painel de edição lateral. Spec §5. Registra select()/openPanel() em ui.
import { STATUS, CHECKS, CLASSE, precOf, esc, slug } from '../model.js';
import { state, byId, kids, descRamos, drivePath, saveNode, saveLink, delNodes, delLink, ui } from '../state.js';
import { nodeMd, downloadText } from '../export.js';
import { ask, linkNoteModal, newElementModal, notesEditor } from './modals.js';

export function select(id) {
  state.sel = id;
  ui.renderAll();
  openPanel();
}

export function openPanel() {
  const p = document.getElementById('panel');
  const n = byId(state.sel);
  if (!n) { p.classList.remove('open'); return; }
  p.classList.add('open');
  const crumbs = [];
  let c = n;
  while (c) { crumbs.unshift(c.label); c = byId(c.parent); }
  const connOf = state.DB.links.map((L, i) => ({ L, i })).filter((o) => o.L.a === n.id || o.L.b === n.id);
  const others = state.DB.nodes.filter((x) => x.id !== n.id && x.tipo !== 'centro');
  const editMeta = n.updated_by
    ? `<div class="hint" style="margin:-2px 0 2px">editado por ${esc(n.updated_by)}${n.updated_at ? ' · ' + new Date(n.updated_at).toLocaleString('pt-BR') : ''}</div>`
    : '';
  p.innerHTML = `
   <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
    <span class="badge" style="background:${STATUS[n.status][1]}">${STATUS[n.status][0]}</span>
    ${n.tipo === 'entidade' ? '<span class="badge" style="background:var(--ent)">◈ Entidade</span>' : ''}
    ${n.classe === 'naoprevisto' ? '<span class="np">✦ não previsto</span>' : ''}
    <span style="flex:1"></span>
    <button id="p-md" title="Baixar ficha .md">⇩ .md</button><button id="pclose">✕</button></div>
   ${editMeta}
   <div id="crumbs">${crumbs.map(esc).join(' › ')}</div>
   <div><label>Título</label><input type="text" id="p-label" value="${esc(n.label)}"></div>
   <div><label>Descrição / o que pesquisar</label><textarea id="p-desc" style="min-height:52px">${esc(n.desc)}</textarea></div>
   <div class="mrow"><div><label>Status</label><select id="p-status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${n.status === k ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></div>
   <div><label>Relevância (tamanho)</label><select id="p-relev">${[1, 2, 3, 4, 5].map((r) => `<option value="${r}"${n.relev == r ? ' selected' : ''}>R${r}${r === 1 ? ' mínima' : r === 5 ? ' máxima' : ''}</option>`).join('')}</select></div></div>
   <div><label>Classe</label><select id="p-classe">${Object.entries(CLASSE).map(([k, v]) => `<option value="${k}"${n.classe === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
   <div><label>Checklist de precisão — P${n.prec}/4${n.prec === 4 ? ' ★' : ''}</label>
    <div style="display:flex;flex-direction:column;gap:4px;margin-top:3px">
    ${Object.entries(CHECKS).map(([k, v]) => `<label style="display:flex;gap:7px;align-items:flex-start;font-size:12px;text-transform:none;letter-spacing:0;font-weight:${n.checks[k] ? '600' : '400'};color:${n.checks[k] ? 'var(--ink)' : 'var(--mut)'};cursor:pointer"><input type="checkbox" data-chk="${k}"${n.checks[k] ? ' checked' : ''} style="margin-top:2px">${v[0]}<span class="hint" style="font-weight:400"> — ${v[1]}</span></label>`).join('')}
    </div></div>
   <div><label>Lotes no Google Drive</label>
    <div id="p-drives">${(n.drives || []).map((d, i) => `<div class="drivelot"><input type="text" data-di="${i}" data-k="label" value="${esc(d.label)}" placeholder="nome do lote" style="max-width:95px"><input type="url" data-di="${i}" data-k="url" value="${esc(d.url)}" placeholder="https://drive.google.com/…">${d.url ? `<a href="${esc(d.url)}" target="_blank" title="Abrir">📁</a>` : ''}<b style="cursor:pointer;color:#dc2626" data-deldrive="${i}">✕</b></div>`).join('')}</div>
    <button id="p-adddrive" style="margin-top:4px">+ lote</button>
    <div class="hint">Pasta sugerida: <code>${drivePath(n)}</code></div></div>
   <div><div style="display:flex;justify-content:space-between;align-items:center"><label>Notas (markdown)</label><button id="p-mdedit" style="padding:2px 8px">⤢ Editor</button></div>
    <textarea id="p-notes" placeholder="# Título&#10;**negrito** *itálico*&#10;- item de lista&#10;[link](https://…)">${esc(n.notes)}</textarea></div>
   <div><label>Conexões (arestas)</label>
    <div>${connOf.map((o) => {
      const other = o.L.a === n.id ? o.L.b : o.L.a;
      const on = byId(other);
      if (!on) return '';
      return `<div class="connbox ${o.L.tipo}"><div class="connhead"><span class="nm" data-go="${other}">${esc(on.label)}</span><u data-tp="${o.i}" title="alternar direta/indireta">${o.L.tipo === 'direto' ? '━ direta' : '╌ indireta'}</u><span data-note="${o.i}" title="anotação da conexão" style="cursor:pointer">📝</span><b data-del="${o.i}">✕</b></div>${o.L.nota ? `<div class="connnote">${esc(o.L.nota)}</div>` : ''}</div>`;
    }).join('') || '<span class="hint">nenhuma</span>'}</div>
    <div class="mrow" style="margin-top:5px"><select id="p-addconn"><option value="">+ conectar a…</option>${others.map((o) => `<option value="${o.id}">${esc(o.label)}</option>`).join('')}</select>
    <select id="p-conntipo" style="max-width:105px"><option value="direto">direta ━</option><option value="indireto">indireta ╌</option></select></div>
    <div class="hint">📝 abre a anotação da conexão (por que esses elementos se ligam)</div></div>
   <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
    <button id="p-child" class="primary">+ Ramificação filha</button>
    ${(n.tipo === 'ramo' || n.tipo === 'entidade') ? '<button id="p-del" class="danger">Excluir</button>' : ''}
   </div>`;
  p.querySelector('#pclose').onclick = () => { state.sel = null; p.classList.remove('open'); ui.renderAll(); };
  p.querySelector('#p-md').onclick = () => downloadText(slug(n.label) + '.md', nodeMd(state.DB, n));
  const upd = (k, v, re) => { n[k] = v; saveNode(n); ui.renderAll(); if (re) openPanel(); };
  p.querySelector('#p-label').onchange = (e) => upd('label', e.target.value, true);
  p.querySelector('#p-desc').onchange = (e) => upd('desc', e.target.value);
  p.querySelector('#p-status').onchange = (e) => upd('status', e.target.value, true);
  p.querySelectorAll('[data-chk]').forEach((cb) => cb.addEventListener('change', (e) => {
    n.checks[e.target.dataset.chk] = e.target.checked;
    n.prec = precOf(n);
    saveNode(n); ui.renderAll(); openPanel();
  }));
  p.querySelector('#p-relev').onchange = (e) => upd('relev', +e.target.value, true);
  p.querySelector('#p-classe').onchange = (e) => upd('classe', e.target.value, true);
  p.querySelector('#p-notes').onchange = (e) => upd('notes', e.target.value);
  p.querySelectorAll('#p-drives input').forEach((inp) => inp.addEventListener('change', (e) => {
    n.drives[+e.target.dataset.di][e.target.dataset.k] = e.target.value.trim();
    saveNode(n); ui.renderAll(); openPanel();
  }));
  p.querySelectorAll('[data-deldrive]').forEach((b) => b.addEventListener('click', () => {
    n.drives.splice(+b.dataset.deldrive, 1);
    saveNode(n); ui.renderAll(); openPanel();
  }));
  p.querySelector('#p-adddrive').onclick = () => {
    n.drives.push({ label: 'Lote ' + (n.drives.length + 1), url: '' });
    saveNode(n); openPanel();
  };
  p.querySelector('#p-mdedit').onclick = () => notesEditor(n);
  p.querySelectorAll('.connhead').forEach((ch) => ch.addEventListener('click', (e) => {
    const t = e.target;
    if (t.tagName === 'B') {
      const L = state.DB.links[+t.dataset.del];
      state.DB.links.splice(+t.dataset.del, 1);
      delLink(L); ui.renderAll(); openPanel();
    } else if (t.tagName === 'U') {
      const L = state.DB.links[+t.dataset.tp];
      L.tipo = L.tipo === 'direto' ? 'indireto' : 'direto';
      saveLink(L); ui.renderAll(); openPanel();
    } else if (t.dataset.note !== undefined) {
      linkNoteModal(+t.dataset.note);
    } else if (t.dataset.go) {
      select(t.dataset.go);
    }
  }));
  p.querySelector('#p-addconn').onchange = (e) => {
    if (e.target.value) {
      const L = { a: n.id, b: e.target.value, tipo: p.querySelector('#p-conntipo').value, nota: '' };
      state.DB.links.push(L);
      saveLink(L); ui.renderAll(); openPanel();
      ui.toast('Conexão criada — clique em 📝 para anotá-la');
    }
  };
  p.querySelector('#p-child').onclick = () => newElementModal(n.id);
  const del = p.querySelector('#p-del');
  if (del) del.onclick = () => ask(`Excluir "${n.label}"${kids(n.id).length ? ' e suas ramificações' : ''}?`, () => {
    const rm = [n.id, ...descRamos(n.id).map((x) => x.id)];
    state.DB.nodes = state.DB.nodes.filter((x) => !rm.includes(x.id));
    state.DB.links = state.DB.links.filter((L) => !rm.includes(L.a) && !rm.includes(L.b));
    state.sel = null;
    delNodes(rm); ui.renderAll(); p.classList.remove('open');
  });
}
