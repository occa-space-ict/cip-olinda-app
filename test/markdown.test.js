import { describe, it, expect } from 'vitest';
import { md } from '../src/ui/markdown.js';

describe('md mini-renderer', () => {
  it('vazio => traço', () => {
    expect(md('')).toContain('—');
  });
  it('headings', () => {
    expect(md('# Titulo')).toContain('<h2>Titulo</h2>');
    expect(md('## Sub')).toContain('<h3>Sub</h3>');
    expect(md('### Menor')).toContain('<h4>Menor</h4>');
  });
  it('negrito, itálico, código', () => {
    expect(md('**forte**')).toContain('<b>forte</b>');
    expect(md('um *ita* fim')).toContain('<i>ita</i>');
    expect(md('`code`')).toContain('<code>code</code>');
  });
  it('listas', () => {
    const h = md('- a\n- b');
    expect(h).toContain('<ul>');
    expect(h).toContain('<li>a</li>');
    expect(h).toContain('<li>b</li>');
  });
  it('links http', () => {
    expect(md('[x](https://a.com)')).toContain('<a href="https://a.com" target="_blank">x</a>');
  });
  it('ESCAPA HTML antes das regras (XSS): < vira &lt; e nenhuma tag abre', () => {
    const h = md('<script>alert(1)</script>');
    expect(h).not.toContain('<script>');
    expect(h).toContain('&lt;script>'); // esc escapa < (e &, "), impedindo a tag
  });
  it('não interpreta javascript: como link', () => {
    // regex exige https?: — javascript: não vira <a>
    expect(md('[x](javascript:alert(1))')).not.toContain('href="javascript');
  });
});
