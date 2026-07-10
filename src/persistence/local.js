// Adapter de persistência localStorage (Fase 0). Mantém paridade com a referência:
// qualquer gravação regrava o documento inteiro na chave versionada.
import { migrate } from '../migrate.js';
import { SEED } from '../seed.js';

const LS = 'cip-olinda-rizoma-v2', LS1 = 'cip-olinda-rizoma-v1';

export function localAdapter() {
  const dump = (DB) => localStorage.setItem(LS, JSON.stringify(DB));
  return {
    async load() {
      try {
        let s = localStorage.getItem(LS);
        if (s) return migrate(JSON.parse(s));
        s = localStorage.getItem(LS1);
        if (s) { const d = migrate(JSON.parse(s)); localStorage.setItem(LS, JSON.stringify(d)); return d; }
      } catch (e) { /* ignora e cai no seed */ }
      return migrate(structuredClone(SEED));
    },
    async saveDoc(DB) { dump(DB); },
    async saveNode(_n, DB) { dump(DB); },
    async saveLink(_L, DB) { dump(DB); },
    async deleteNodes(_ids, DB) { dump(DB); },
    async deleteLink(_L, DB) { dump(DB); },
  };
}
