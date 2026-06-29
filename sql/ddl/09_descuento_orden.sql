-- 09_descuento_orden.sql
alter table ordenes_venta add column if not exists descuento_id bigint references descuentos(id);
alter table ordenes_venta add column if not exists descuento_aplicado numeric(12,2);
