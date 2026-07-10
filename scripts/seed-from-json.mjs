// Gera SQL de seed a partir de um JSON v4 (default: o SEED da referência).
// Uso: node scripts/seed-from-json.mjs [caminho.json] > seed.sql
// O JSON é embutido como jsonb e expandido com jsonb_array_elements — sem escaping frágil.
import { readFileSync } from 'node:fs';
import { SEED } from '../src/seed.js';
import { migrate } from '../src/migrate.js';

const arg = process.argv[2];
const doc = arg ? migrate(JSON.parse(readFileSync(arg, 'utf8'))) : migrate(structuredClone(SEED));
const payload = JSON.stringify({ nodes: doc.nodes, links: doc.links });

// Temp table embute o JSON uma única vez (dollar-quoting evita conflito de aspas).
const sql = `-- Seed gerado por scripts/seed-from-json.mjs (${doc.nodes.length} nós, ${doc.links.length} conexões)
-- Substitui todo o conteúdo. Idempotente por id / par (a,b).
create temp table _seed(d jsonb) on commit drop;
insert into _seed values ($seed$${payload}$seed$::jsonb);

insert into nodes (id,parent,tipo,label,"desc",status,checks,relev,classe,drives,notes,x,y,updated_by)
select n->>'id', nullif(n->>'parent',''), n->>'tipo', n->>'label', coalesce(n->>'desc',''),
       coalesce(n->>'status','planejado'),
       coalesce(n->'checks','{"abnt":false,"dpi":false,"aut":false,"cur":false}'::jsonb),
       coalesce((n->>'relev')::int,2), coalesce(n->>'classe','previsto'),
       coalesce(n->'drives','[]'::jsonb), coalesce(n->>'notes',''),
       (n->>'x')::double precision, (n->>'y')::double precision, 'seed'
from _seed, jsonb_array_elements(d->'nodes') n
on conflict (id) do update set
  parent=excluded.parent, tipo=excluded.tipo, label=excluded.label, "desc"=excluded."desc",
  status=excluded.status, checks=excluded.checks, relev=excluded.relev, classe=excluded.classe,
  drives=excluded.drives, notes=excluded.notes, x=excluded.x, y=excluded.y;

insert into links (a,b,tipo,nota,updated_by)
select l->>'a', l->>'b', coalesce(l->>'tipo','direto'), coalesce(l->>'nota',''), 'seed'
from _seed, jsonb_array_elements(d->'links') l
on conflict (a,b) do update set tipo=excluded.tipo, nota=excluded.nota;
`;
process.stdout.write(sql);
