create or replace function fn_auditar_cambios()
returns trigger
language plpgsql
as $$
declare
  v_usuario text := coalesce(current_setting('app.user', true), current_user);
  v_registro text;
begin
  v_registro := coalesce((to_jsonb(coalesce(new, old))->>'id'), null);

  insert into auditoria (
    usuario,
    accion,
    tabla_afectada,
    registro_id,
    valores_anteriores,
    valores_nuevos
  )
  values (
    v_usuario,
    tg_op,
    tg_table_name,
    v_registro,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_productos_auditoria
after insert or update or delete on productos
for each row execute function fn_auditar_cambios();

create trigger trg_clientes_auditoria
after insert or update or delete on clientes
for each row execute function fn_auditar_cambios();

create trigger trg_movimientos_auditoria
after insert or update or delete on movimientos_inventario
for each row execute function fn_auditar_cambios();

create trigger trg_ordenes_auditoria
after insert or update or delete on ordenes_venta
for each row execute function fn_auditar_cambios();

create trigger trg_orden_items_auditoria
after insert or update or delete on orden_items
for each row execute function fn_auditar_cambios();
