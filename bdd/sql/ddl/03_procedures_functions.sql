create or replace procedure sp_insertar_producto(
  p_sku varchar,
  p_nombre varchar,
  p_categoria_id bigint,
  p_proveedor_id bigint,
  p_precio numeric,
  p_stock_actual integer,
  p_stock_minimo integer,
  p_activo boolean default true
)
language plpgsql
as $$
declare
  v_producto_id bigint;
begin
  if p_precio <= 0 then
    raise exception 'El precio debe ser mayor a cero';
  end if;

  if p_stock_actual < 0 or p_stock_minimo < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  insert into productos(sku, nombre, categoria_id, precio, stock_actual, stock_minimo, activo)
  values (upper(p_sku), p_nombre, p_categoria_id, p_precio, p_stock_actual, p_stock_minimo, p_activo)
  returning id into v_producto_id;

  if p_proveedor_id is not null then
    insert into producto_proveedor(producto_id, proveedor_id, costo, es_principal)
    values (v_producto_id, p_proveedor_id, p_precio * 0.75, true);
  end if;
end;
$$;

create or replace procedure sp_actualizar_stock_producto(
  p_producto_id bigint,
  p_delta integer,
  p_motivo varchar,
  p_tipo varchar default null
)
language plpgsql
as $$
declare
  v_stock integer;
  v_tipo varchar(20);
begin
  if p_delta = 0 then
    raise exception 'El delta no puede ser cero';
  end if;

  select stock_actual + p_delta into v_stock
  from productos
  where id = p_producto_id and activo;

  if v_stock is null then
    raise exception 'Producto no encontrado o inactivo';
  end if;

  if v_stock < 0 then
    raise exception 'La salida supera el stock disponible';
  end if;

  update productos
  set stock_actual = v_stock, updated_at = now()
  where id = p_producto_id;

  v_tipo := coalesce(p_tipo, case when p_delta < 0 then 'SALIDA' else 'ENTRADA' end);

  insert into movimientos_inventario(producto_id, tipo, cantidad, motivo)
  values (p_producto_id, v_tipo, abs(p_delta), p_motivo);
end;
$$;

create or replace procedure sp_eliminar_producto_logico(p_producto_id bigint)
language plpgsql
as $$
begin
  update productos
  set activo = false, updated_at = now()
  where id = p_producto_id;

  if not found then
    raise exception 'Producto no encontrado';
  end if;
end;
$$;

create or replace function fn_valor_inventario()
returns numeric
language sql
as $$
  select coalesce(sum(precio * stock_actual), 0)
  from productos
  where activo;
$$;

create or replace function fn_productos_bajo_stock()
returns table (
  producto_id bigint,
  sku varchar,
  nombre varchar,
  stock_actual integer,
  stock_minimo integer
)
language sql
as $$
  select id, sku, nombre, stock_actual, stock_minimo
  from productos
  where activo and stock_actual <= stock_minimo
  order by stock_actual asc, nombre;
$$;

create or replace function fn_reporte_ventas_cliente(p_cliente_id bigint)
returns table (
  cliente varchar,
  ordenes bigint,
  total_comprado numeric,
  ultima_compra timestamptz
)
language sql
as $$
  select c.nombre,
         count(o.id) as ordenes,
         coalesce(sum(o.total), 0) as total_comprado,
         max(o.fecha) as ultima_compra
  from clientes c
  left join ordenes_venta o on o.cliente_id = c.id and o.estado <> 'ANULADA'
  where c.id = p_cliente_id
  group by c.nombre;
$$;
