-- Hardening: fixa search_path da função de trigger (advisor 0011).
create or replace function touch_updated_at() returns trigger
  language plpgsql
  set search_path = ''
  as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
