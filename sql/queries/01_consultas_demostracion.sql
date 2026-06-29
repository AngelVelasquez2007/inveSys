-- 1. Productos con categoria y proveedor principal.
select p.sku, p.nombre, c.nombre as categoria, pr.nombre as proveedor, p.stock_actual
from productos p
join categorias c on c.id = p.categoria_id
left join producto_proveedor pp on pp.producto_id = p.id and pp.es_principal
left join proveedores pr on pr.id = pp.proveedor_id
order by p.nombre;

-- 2. Clientes con total comprado y ultima compra.
select c.nombre, count(o.id) as ordenes, coalesce(sum(o.total), 0) as total_comprado, max(o.fecha) as ultima_compra
from clientes c
left join ordenes_venta o on o.cliente_id = c.id and o.estado <> 'ANULADA'
group by c.id, c.nombre
order by total_comprado desc;

-- 3. Productos bajo stock usando funcion personalizada.
select * from fn_productos_bajo_stock();

-- 4. Valor total del inventario usando funcion personalizada.
select fn_valor_inventario() as valor_total_inventario;

-- 5. Subconsulta correlacionada: productos con precio superior al promedio de su categoria.
select p.sku, p.nombre, p.precio
from productos p
where p.precio > (
  select avg(p2.precio)
  from productos p2
  where p2.categoria_id = p.categoria_id
);

-- 6. Movimientos por producto en los ultimos 30 dias.
select p.sku, p.nombre,
       sum(case when m.tipo = 'ENTRADA' then m.cantidad else 0 end) as entradas,
       sum(case when m.tipo = 'SALIDA' then m.cantidad else 0 end) as salidas
from productos p
join movimientos_inventario m on m.producto_id = p.id
where m.created_at >= now() - interval '30 days'
group by p.id, p.sku, p.nombre;

-- 7. Ranking de clientes por ventas.
select c.nombre, sum(o.total) as total, dense_rank() over (order by sum(o.total) desc) as ranking
from clientes c
join ordenes_venta o on o.cliente_id = c.id
where o.estado <> 'ANULADA'
group by c.id, c.nombre;

-- 8. Detalle de ordenes con agregacion de items.
select o.id, c.nombre as cliente, o.estado, count(oi.id) as items, sum(oi.subtotal) as subtotal
from ordenes_venta o
join clientes c on c.id = o.cliente_id
join orden_items oi on oi.orden_id = o.id
group by o.id, c.nombre, o.estado
order by o.fecha desc;

-- 9. Auditoria de cambios recientes en tablas principales.
select usuario, accion, tabla_afectada, registro_id, created_at
from auditoria
where tabla_afectada in ('productos', 'clientes', 'movimientos_inventario')
order by created_at desc
limit 20;

-- 10. Reporte de ventas de un cliente especifico.
select * from fn_reporte_ventas_cliente(1);
