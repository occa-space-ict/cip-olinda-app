// Bootstrap: escolhe persistência (Supabase se configurado, senão localStorage),
// aplica o auth gate, liga a toolbar e faz o primeiro render.
import { state, ui, setPersistence, save } from './state.js';
import { esc } from './model.js';
import { migrate } from './migrate.js';
import { SEED } from './seed.js';
import { layout } from './graph/layout.js';
import { renderGraph, initInteractions, zoom, fit } from './graph/render.js';
import { renderList } from './ui/list.js';
import { select, openPanel } from './ui/panel.js';
import { newElementModal, newEntityModal, ask } from './ui/modals.js';
import { allMd, downloadText } from './export.js';
import { localAdapter } from './persistence/local.js';
import { hasSupabase, supabase, getSession, currentEmail, sendMagicLink, signOut, isMember, supabaseAdapter } from './api.js';

// ---- ações de UI globais ----
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.style.display = 'none'), 2200);
}

function renderStats() {
  const r = state.DB.nodes.filter((n) => n.tipo === 'ramo');
  const c = (s) => r.filter((n) => n.status === s).length;
  const p4 = r.filter((n) => n.prec === 4).length;
  const np = state.DB.nodes.filter((n) => n.classe === 'naoprevisto').length;
  document.getElementById('stats').innerHTML =
    `<span>${r.length} elementos</span><span style="color:var(--af)">◦ ${c('afazer')} a fazer</span><span style="color:var(--fz)">◦ ${c('fazendo')} fazendo</span><span style="color:var(--ft)">◦ ${c('feito')} feitos</span><span style="color:#b45309">★ ${p4} P4</span><span style="color:var(--np)">✦ ${np} não previstos</span>`;
}

function renderAll() {
  renderStats();
  if (state.view === 'map') {
    document.getElementById('mapwrap').style.display = 'block';
    document.getElementById('list').classList.remove('open');
    renderGraph();
  } else {
    document.getElementById('mapwrap').style.display = 'none';
    document.getElementById('list').classList.add('open');
    renderList();
  }
}

// registra ações no barramento compartilhado
ui.renderAll = renderAll;
ui.toast = toast;
ui.select = select;
ui.openPanel = openPanel;

// ---- toolbar ----
function wireToolbar() {
  document.querySelectorAll('.chip').forEach((ch) => ch.addEventListener('click', () => {
    const s = ch.dataset.s;
    if (s === 'all') state.fstatus.clear();
    else state.fstatus.has(s) ? state.fstatus.delete(s) : state.fstatus.add(s);
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.s === 'all' ? state.fstatus.size === 0 : state.fstatus.has(c.dataset.s)));
    renderAll();
  }));
  document.getElementById('fprec').onchange = (e) => { state.fprec = +e.target.value; renderAll(); };
  document.getElementById('fclasse').onchange = (e) => { state.fclasse = e.target.value; renderAll(); };
  document.getElementById('fsearch').oninput = (e) => { state.fsearch = e.target.value.trim(); renderAll(); };
  document.getElementById('fconn').onchange = (e) => { state.showConn = e.target.checked; renderAll(); };
  document.getElementById('flayers').oninput = (e) => {
    state.flayers = +e.target.value;
    document.getElementById('flayerslbl').textContent = { 1: 'só filtrados', 2: '+ camada direta', 3: '+ camada distante' }[state.flayers];
    renderAll();
  };
  document.getElementById('vtoggle').onclick = function () {
    state.view = state.view === 'map' ? 'list' : 'map';
    this.textContent = state.view === 'map' ? '☰ Lista' : '🌿 Mapa';
    renderAll();
  };
  document.getElementById('addbtn').onclick = () => newElementModal(null);
  document.getElementById('entbtn').onclick = () => newEntityModal();
  document.getElementById('expbtn').onclick = () => downloadText('cip-olinda-rizoma.json', JSON.stringify(state.DB, null, 2));
  document.getElementById('expmd').onclick = () => downloadText('cip-olinda-mapa.md', allMd(state.DB));
  document.getElementById('impbtn').onclick = () => document.getElementById('impfile').click();
  document.getElementById('impfile').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const d = migrate(JSON.parse(rd.result));
        if (d && d.nodes) {
          state.DB = d;
          layout(state.DB, false);
          await save();
          renderAll();
          toast('Importado');
        } else toast('JSON inválido');
      } catch (x) { toast('Erro ao ler JSON'); }
    };
    rd.readAsText(f);
  };
  document.getElementById('rstbtn').onclick = () => ask('Restaurar o mapa original? Suas edições serão perdidas.', async () => {
    state.DB = migrate(structuredClone(SEED));
    state.sel = null;
    layout(state.DB, true);
    await save();
    renderAll();
  });
  document.getElementById('overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') e.target.classList.remove('open'); });
  document.getElementById('zin').onclick = () => zoom(0.8);
  document.getElementById('zout').onclick = () => zoom(1.25);
  document.getElementById('zfit').onclick = () => fit();
  document.getElementById('zheat').onclick = async () => { layout(state.DB, true); await save(); renderAll(); toast('Posições redistribuídas'); };
}

// ---- boot ----
async function startApp(meta) {
  document.getElementById('gate').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  if (meta) document.getElementById('appmeta').innerHTML = meta;
  wireToolbar();
  initInteractions();
  try {
    const loaded = await state_load();
    state.DB = loaded && loaded.nodes ? loaded : migrate(structuredClone(SEED));
  } catch (e) {
    console.error(e);
    toast('Erro ao carregar dados — usando seed local');
    state.DB = migrate(structuredClone(SEED));
  }
  layout(state.DB, false);
  renderAll();
}

let _adapterLoad = async () => migrate(structuredClone(SEED));
const state_load = () => _adapterLoad();

async function bootLocal() {
  const a = localAdapter();
  setPersistence(a);
  _adapterLoad = () => a.load();
  await startApp('<span title="Sem backend configurado — dados só neste navegador">💾 modo local</span>');
}

async function bootSupabase() {
  const gate = document.getElementById('gate');
  const msg = document.getElementById('gate-msg');
  gate.style.display = 'flex';

  let started = false;
  const proceed = async (session) => {
    if (started) return; // getSession() e onAuthStateChange podem disparar juntos
    started = true;
    const email = currentEmail(session);
    const { ok, role } = await isMember(email);
    if (!ok) {
      msg.className = 'msg err';
      msg.innerHTML = `<b>${esc(email)}</b> não está na lista de acesso.<br>Peça ao administrador para incluir seu e-mail. <a href="#" id="gate-out">sair</a>`;
      document.getElementById('gate-out').onclick = async (e) => { e.preventDefault(); await signOut(); location.reload(); };
      return;
    }
    const a = supabaseAdapter(() => email);
    setPersistence(a);
    _adapterLoad = () => a.load();
    const meta = `<span title="Autenticado">👤 ${esc(email)}${role === 'admin' ? ' · admin' : ''}</span> <button id="am-out">sair</button>`;
    await startApp(meta);
    const out = document.getElementById('am-out');
    if (out) out.onclick = async () => { await signOut(); location.reload(); };
    // Banco vazio no primeiro uso: admin pode semear com o mapa inicial.
    if (state.DB.nodes.length === 0) {
      if (role === 'admin') {
        ask('Banco vazio. Semear com o mapa inicial (12 eixos + ramificações e conexões)?', async () => {
          state.DB = migrate(structuredClone(SEED));
          layout(state.DB, true);
          await save();
          renderAll();
          toast('Mapa inicial semeado');
        });
      } else {
        toast('Banco vazio — peça ao administrador para semear o mapa.');
      }
    }
  };

  document.getElementById('gate-send').onclick = async () => {
    const email = document.getElementById('gate-email').value.trim();
    if (!email) return;
    msg.className = 'msg';
    msg.textContent = 'Enviando…';
    const { error } = await sendMagicLink(email);
    if (error) { msg.className = 'msg err'; msg.textContent = 'Erro: ' + error.message; }
    else { msg.className = 'msg ok'; msg.textContent = 'Link enviado! Verifique seu e-mail e abra o link neste navegador.'; }
  };

  supabase.auth.onAuthStateChange((_evt, session) => {
    if (session) proceed(session);
  });

  const session = await getSession();
  if (session) proceed(session);
}

if (hasSupabase) bootSupabase();
else bootLocal();
