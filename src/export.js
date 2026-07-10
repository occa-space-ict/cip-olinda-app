// Exports .md (por nó e geral) e download. JSON export é trivial e fica em main.js.
// Compatível com Obsidian ([[wikilinks]]). Spec §9.
import { STATUS, CHECKS, CLASSE, byIdIn, drivePath, descRamos } from './model.js';

export function nodeMd(DB, n) {
  const nodes = DB.nodes;
  const byId = (id) => byIdIn(nodes, id);
  const crumbs = [];
  let c = n;
  while (c) { crumbs.unshift(c.label); c = byId(c.parent); }
  const conns = DB.links
    .filter((L) => L.a === n.id || L.b === n.id)
    .map((L) => {
      const o = byId(L.a === n.id ? L.b : L.a);
      return o ? `- [[${o.label}]] (${L.tipo})${L.nota ? ' — ' + L.nota : ''}` : '';
    })
    .filter(Boolean);
  return `# ${n.label}

> ${crumbs.join(' › ')}

- **Status:** ${STATUS[n.status][0]}
- **Precisão:** P${n.prec}/4
- **Relevância:** R${n.relev}
- **Classe:** ${CLASSE[n.classe] || n.classe}
- **Pasta sugerida:** \`${drivePath(nodes, n)}\`

## Checklist de precisão

${Object.entries(CHECKS).map(([k, v]) => `- [${n.checks && n.checks[k] ? 'x' : ' '}] ${v[0]} — ${v[1]}`).join('\n')}

## Descrição

${n.desc || '—'}

## Notas

${n.notes || '—'}

## Conexões

${conns.join('\n') || '—'}

## Lotes no Google Drive

${(n.drives || []).map((d) => `- [${d.label}](${d.url})`).join('\n') || '—'}
`;
}

export function allMd(DB) {
  let out = `# Mapa Rizomático — CIP Olinda\n\nExportado em ${new Date().toLocaleDateString('pt-BR')}\n\n`;
  const groups = DB.nodes.filter(
    (n) => n.tipo === 'eixo' || n.tipo === 'transversal' || n.tipo === 'entidade' || (n.tipo === 'ramo' && (n.parent === 'cip' || !n.parent)),
  );
  groups.forEach((x) => {
    out += '\n---\n\n' + nodeMd(DB, x);
    descRamos(DB.nodes, x.id).forEach((n) => {
      out += '\n---\n\n' + nodeMd(DB, n);
    });
  });
  return out;
}

export function downloadText(name, text) {
  const b = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
}
