-- is_member() consultava project_members estando sujeita à própria RLS de
-- project_members, causando "infinite recursion detected in policy for
-- relation project_members" (visto em produção ao logar um 2º membro).
-- SET row_security = off faz a consulta interna ignorar RLS — seguro aqui,
-- pois a checagem de existência já É o controle de acesso, sem escalonamento
-- de privilégio (a função continua só respondendo true/false).
create or replace function is_member() returns boolean
  language sql stable security definer
  set search_path = public
  set row_security = off
as $$
  select exists (select 1 from project_members where email = auth.jwt()->>'email');
$$;

create or replace function is_admin() returns boolean
  language sql stable security definer
  set search_path = public
  set row_security = off
as $$
  select exists (select 1 from project_members where email = auth.jwt()->>'email' and role = 'admin');
$$;

-- pm_admin_all tinha o mesmo padrão recursivo (subquery inline em vez da
-- função com row_security=off); troca para is_admin().
drop policy if exists pm_admin_all on project_members;
create policy pm_admin_all on project_members for all
  using (is_admin())
  with check (is_admin());
