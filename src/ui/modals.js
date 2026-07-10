// Modais próprios (prompt/confirm/alert são bloqueados em iframes — CLAUDE.md).
import { N, esc, slug } from '../model.js';
import { state, byId, kids, descRamos, save, saveNode, saveLink, ui } from '../state.js';
import { layout } from '../graph/layout.js';
import { md } from './markdown.js';
import { downloadText } from '../export.js';

export function modal(html, wide) {
  const ov = document.getElementById('overlay'), m = document.getElementById('modal');
  m.className = wide ? 'wide' : '';
  m.innerHTML = html;
  ov.classList.add('open');
  return { close: () => ov.classList.remove('open'), el: m };
}

export function ask(msg, cb) {
  const m = modal(`<h2>${esc(msg)}</h2><div style="display:flex;gap:8px;justify-content:flex-end"><button id="m-no">Cancelar</button><button id="m-yes" class="primary">Confirmar</button></div>`);
  m.el.querySelector('#m-no').onclick = m.close;
  m.el.querySelector('#m-yes').onclick = () => { m.close(); cb(); };
}

export function linkNoteModal(i) {
  const L = state.DB.links[i];
  if (!L) return;
  const A = byId(L.a), B = byId(L.b);
  const m = modal(`<h2>Anotação da conexão</h2>
   <div class="hint">${esc(A ? A.label : '?')} ⟷ ${esc(B ? B.label : '?')} · <b>${L.tipo === 'direto' ? '━ direta' : '╌ indireta'}</b></div>
   <div><label>Por que esses elementos se conectam? (contexto, fonte, uso na expografia…)</label>
   <textarea id="m-nota" style="min-height:120px">${esc(L.nota || '')}</textarea></div>
   <div style="display:flex;gap:8px;justify-content:space-between">
    <button id="m-tipo">${L.tipo === 'direto' ? 'tornar indireta ╌' : 'tornar direta ━'}</button>
    <div style="display:flex;gap:8px"><button id="m-no">Cancelar</button><button id="m-ok" class="primary">Salvar</button></div></div>`);
  m.el.querySelector('#m-tipo').onclick = function () {
    L.tipo = L.tipo === 'direto' ? 'indireto' : 'direto';
    this.textContent = L.tipo === 'direto' ? 'tornar indireta ╌' : 'tornar direta ━';
    saveLink(L); ui.renderAll();
  };
  m.el.querySelector('#m-no').onclick = m.close;
  m.el.querySelector('#m-ok').onclick = () => {
    L.nota = m.el.querySelector('#m-nota').value.trim();
    saveLink(L); m.close(); ui.renderAll();
    if (state.sel) ui.openPanel();
    ui.toast('Anotação salva');
  };
}

export function newElementModal(parentId) {
  const parents = state.DB.nodes.slice().sort((a, b) => a.label.localeCompare(b.label));
  const m = modal(`<h2>+ Novo elemento</h2>
   <div><label>Nome</label><input type="text" id="m-label" placeholder="ex.: Entrevista com tapioqueiras"></div>
   <div><label>Anexar a (eixo ou elemento-pai — hierarquias profundas são permitidas)</label><select id="m-parent">${parents.map((o) => `<option value="${o.id}"${o.id === (parentId || 'cip') ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
   <div class="mrow"><div><label>Classe</label><select id="m-classe"><option value="naoprevisto">Não previsto ✦ (potencialidade)</option><option value="previsto">Previsto (escopo original)</option></select></div>
   <div><label>Relevância</label><select id="m-relev">${[1, 2, 3, 4, 5].map((r) => `<option value="${r}"${r === 2 ? ' selected' : ''}>R${r}</option>`).join('')}</select></div></div>
   <div><label>Descrição (opcional)</label><textarea id="m-desc" style="min-height:50px"></textarea></div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button id="m-no">Cancelar</button><button id="m-ok" class="primary">Criar</button></div>`);
  m.el.querySelector('#m-label').focus();
  m.el.querySelector('#m-no').onclick = m.close;
  m.el.querySelector('#m-ok').onclick = () => {
    const label = m.el.querySelector('#m-label').value.trim();
    if (!label) { m.el.querySelector('#m-label').style.borderColor = '#dc2626'; return; }
    const id = 'n' + Date.now();
    const node = N(id, m.el.querySelector('#m-parent').value, 'ramo', label, m.el.querySelector('#m-desc').value.trim(),
      { classe: m.el.querySelector('#m-classe').value, relev: +m.el.querySelector('#m-relev').value });
    state.DB.nodes.push(node);
    layout(state.DB, false);
    saveNode(node);
    m.close(); ui.select(id); ui.toast('Elemento criado');
  };
}

export function newEntityModal() {
  const alvos = state.DB.nodes.filter((x) => x.tipo === 'eixo' || x.tipo === 'ramo').sort((a, b) => a.label.localeCompare(b.label));
  const m = modal(`<h2 style="color:var(--ent)">◈ Nova entidade</h2>
   <div class="hint">Pessoa, instituição, colecionador ou grupo. Uma entidade não pertence a um eixo — ela alimenta várias frentes ao mesmo tempo, pelas conexões.</div>
   <div><label>Nome</label><input type="text" id="m-label" placeholder="ex.: Fundaj, Plínio Victor, colecionador de postais…"></div>
   <div><label>Descrição (papel, contato, próxima reunião…)</label><textarea id="m-desc" style="min-height:50px"></textarea></div>
   <div class="mrow"><div><label>Classe</label><select id="m-classe"><option value="previsto">Previsto (escopo original)</option><option value="naoprevisto">Não previsto ✦ (potencialidade)</option></select></div>
   <div><label>Relevância</label><select id="m-relev">${[1, 2, 3, 4, 5].map((r) => `<option value="${r}"${r === 3 ? ' selected' : ''}>R${r}</option>`).join('')}</select></div></div>
   <div><label>Conecta-se a (marque todas as frentes que essa entidade alimenta)</label>
    <div style="max-height:180px;overflow-y:auto;border:1px solid var(--line);border-radius:6px;padding:6px 8px;display:flex;flex-direction:column;gap:3px">
    ${alvos.map((o) => `<label style="display:flex;gap:6px;font-size:12px;text-transform:none;letter-spacing:0;font-weight:${o.tipo === 'eixo' ? '700' : '400'};cursor:pointer"><input type="checkbox" data-tgt="${o.id}">${esc(o.label)}</label>`).join('')}
    </div></div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button id="m-no">Cancelar</button><button id="m-ok" class="primary" style="background:var(--ent);border-color:var(--ent)">Criar entidade</button></div>`);
  m.el.querySelector('#m-label').focus();
  m.el.querySelector('#m-no').onclick = m.close;
  m.el.querySelector('#m-ok').onclick = () => {
    const label = m.el.querySelector('#m-label').value.trim();
    if (!label) { m.el.querySelector('#m-label').style.borderColor = '#dc2626'; return; }
    const id = 'ent' + Date.now();
    const node = N(id, null, 'entidade', label, m.el.querySelector('#m-desc').value.trim(),
      { classe: m.el.querySelector('#m-classe').value, relev: +m.el.querySelector('#m-relev').value });
    state.DB.nodes.push(node);
    layout(state.DB, false);
    saveNode(node);
    m.el.querySelectorAll('[data-tgt]:checked').forEach((cb) => {
      const L = { a: id, b: cb.dataset.tgt, tipo: 'direto', nota: '' };
      state.DB.links.push(L);
      saveLink(L);
    });
    m.close(); ui.select(id); ui.toast('Entidade criada e conectada');
  };
}

export function notesEditor(n) {
  const m = modal(`<h2>Notas — ${esc(n.label)}</h2>
   <div class="mdtb">
    <button data-md="**" data-w="1"><b>B</b></button><button data-md="*" data-w="1"><i>I</i></button>
    <button data-md="# " data-line="1">H1</button><button data-md="## " data-line="1">H2</button>
    <button data-md="- " data-line="1">• lista</button>
    <button id="md-link">🔗 link</button>
    <span style="flex:1"></span><button id="md-dl">⇩ baixar .md</button>
   </div>
   <div id="mdsplit"><textarea id="md-ta">${esc(n.notes)}</textarea><div id="mdprev"></div></div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button id="m-no">Fechar sem salvar</button><button id="m-ok" class="primary">Salvar notas</button></div>`, true);
  const ta = m.el.querySelector('#md-ta'), pv = m.el.querySelector('#mdprev');
  const prev = () => (pv.innerHTML = md(ta.value));
  prev();
  ta.addEventListener('input', prev);
  function insert(before, after, line) {
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    if (line) {
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      ta.value = v.slice(0, ls) + before + v.slice(ls);
      ta.selectionStart = ta.selectionEnd = e + before.length;
    } else {
      ta.value = v.slice(0, s) + before + v.slice(s, e) + (after || before) + v.slice(e);
      ta.selectionStart = s + before.length;
      ta.selectionEnd = e + before.length;
    }
    ta.focus(); prev();
  }
  m.el.querySelectorAll('[data-md]').forEach((b) => b.addEventListener('click', () => insert(b.dataset.md, b.dataset.w ? b.dataset.md : '', b.dataset.line)));
  m.el.querySelector('#md-link').onclick = () => insert('[texto](https://)', '', false);
  m.el.querySelector('#md-dl').onclick = () => downloadText(slug(n.label) + '-notas.md', ta.value);
  m.el.querySelector('#m-no').onclick = m.close;
  m.el.querySelector('#m-ok').onclick = () => {
    n.notes = ta.value;
    saveNode(n); m.close(); ui.renderAll(); ui.openPanel(); ui.toast('Notas salvas');
  };
}
