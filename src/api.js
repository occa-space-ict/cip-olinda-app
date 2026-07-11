// Camada Supabase: cliente, auth (magic link + allowlist) e adapter de persistência.
// Só é usada quando VITE_SUPABASE_URL/ANON_KEY estão definidos (senão roda em localStorage).
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = !!(URL && KEY);
export const supabase = hasSupabase ? createClient(URL, KEY) : null;

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function currentEmail(session) {
  return session?.user?.email || null;
}

export async function sendMagicLink(email) {
  // BASE_URL inclui o subpath do GitHub Pages (ex.: /cip-olinda-app/) — usar
  // window.location.origin sozinho perde o subpath e quebra o redirect.
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// Verifica allowlist project_members. RLS permite ao próprio membro ler sua linha.
export async function isMember(email) {
  const { data, error } = await supabase
    .from('project_members')
    .select('email, role')
    .eq('email', email)
    .maybeSingle();
  if (error) return { ok: false, role: null };
  return { ok: !!data, role: data?.role || null };
}

// ---- mapeamento linha <-> nó ----
function rowFromNode(n, email) {
  return {
    id: n.id, parent: n.parent, tipo: n.tipo, label: n.label,
    desc: n.desc || '', status: n.status,
    checks: n.checks, relev: n.relev, classe: n.classe,
    drives: n.drives || [], notes: n.notes || '',
    x: n.x, y: n.y,
    updated_at: new Date().toISOString(), updated_by: email,
  };
}
function nodeFromRow(r) {
  return {
    id: r.id, parent: r.parent, tipo: r.tipo, label: r.label,
    desc: r.desc || '', status: r.status,
    checks: r.checks || { abnt: false, dpi: false, aut: false, cur: false },
    prec: r.prec ?? 0, relev: r.relev, classe: r.classe,
    drives: r.drives || [], notes: r.notes || '',
    x: r.x, y: r.y,
    updated_at: r.updated_at, updated_by: r.updated_by,
  };
}
function rowFromLink(L, email) {
  return { a: L.a, b: L.b, tipo: L.tipo, nota: L.nota || '', updated_at: new Date().toISOString(), updated_by: email };
}

// Ordena nós pai-antes-de-filho (defesa extra além da FK deferrable).
function byDepth(nodes) {
  const depth = (n) => {
    let d = 0, c = n;
    const map = Object.fromEntries(nodes.map((x) => [x.id, x]));
    while (c && c.parent && map[c.parent]) { d++; c = map[c.parent]; if (d > 50) break; }
    return d;
  };
  return nodes.slice().sort((a, b) => depth(a) - depth(b));
}

export function supabaseAdapter(getEmail) {
  const email = () => getEmail() || null;
  return {
    async load() {
      const [nq, lq] = await Promise.all([
        supabase.from('nodes').select('*'),
        supabase.from('links').select('*'),
      ]);
      if (nq.error) throw nq.error;
      if (lq.error) throw lq.error;
      return {
        v: 4,
        nodes: (nq.data || []).map(nodeFromRow),
        links: (lq.data || []).map((r) => ({ a: r.a, b: r.b, tipo: r.tipo, nota: r.nota || '' })),
      };
    },
    async saveNode(n) {
      const { error } = await supabase.from('nodes').upsert(rowFromNode(n, email()), { onConflict: 'id' });
      if (error) throw error;
    },
    async saveLink(L) {
      const { error } = await supabase.from('links').upsert(rowFromLink(L, email()), { onConflict: 'a,b' });
      if (error) throw error;
    },
    async deleteNodes(ids) {
      const { error } = await supabase.from('nodes').delete().in('id', ids); // cascade limpa links
      if (error) throw error;
    },
    async deleteLink(L) {
      const { error } = await supabase.from('links').delete().eq('a', L.a).eq('b', L.b);
      if (error) throw error;
    },
    // Sincronização completa (import / restaurar seed / redistribuir): substitui tudo.
    async saveDoc(DB) {
      const e = email();
      // apaga tudo (nodes cascata em links) e reinsere
      const delN = await supabase.from('nodes').delete().neq('id', '__none__');
      if (delN.error) throw delN.error;
      const nodeRows = byDepth(DB.nodes).map((n) => rowFromNode(n, e));
      const insN = await supabase.from('nodes').insert(nodeRows);
      if (insN.error) throw insN.error;
      if (DB.links.length) {
        const insL = await supabase.from('links').insert(DB.links.map((L) => rowFromLink(L, e)));
        if (insL.error) throw insL.error;
      }
    },
  };
}
