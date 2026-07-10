// Mini-renderer markdown. ATENÇÃO: escapa HTML ANTES de aplicar regras (evita XSS).
// Nunca inverter a ordem (CLAUDE.md — armadilha conhecida).
import { esc } from '../model.js';

export function md(s) {
  if (!s) return '<span class="hint">—</span>';
  const lines = esc(s).split('\n');
  let out = '', inUl = false;
  const inline = (t) =>
    t
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  for (const L of lines) {
    let m;
    if ((m = L.match(/^###\s+(.*)/))) {
      if (inUl) { out += '</ul>'; inUl = false; }
      out += '<h4>' + inline(m[1]) + '</h4>';
    } else if ((m = L.match(/^##\s+(.*)/))) {
      if (inUl) { out += '</ul>'; inUl = false; }
      out += '<h3>' + inline(m[1]) + '</h3>';
    } else if ((m = L.match(/^#\s+(.*)/))) {
      if (inUl) { out += '</ul>'; inUl = false; }
      out += '<h2>' + inline(m[1]) + '</h2>';
    } else if ((m = L.match(/^[-*]\s+(.*)/))) {
      if (!inUl) { out += '<ul>'; inUl = true; }
      out += '<li>' + inline(m[1]) + '</li>';
    } else if (L.trim() === '') {
      if (inUl) { out += '</ul>'; inUl = false; }
      out += '<div style="height:6px"></div>';
    } else {
      if (inUl) { out += '</ul>'; inUl = false; }
      out += '<div>' + inline(L) + '</div>';
    }
  }
  if (inUl) out += '</ul>';
  return out;
}
