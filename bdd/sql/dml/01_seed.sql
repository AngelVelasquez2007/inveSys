insert into roles(nombre, descripcion) values
('Administrador', 'Acceso total al sistema'),
('Bodega', 'Gestiona inventario y movimientos'),
('Ventas', 'Gestiona clientes y ventas'),
('Compras', 'Gestiona proveedores'),
('Auditor', 'Consulta registros de auditoria'),
('Gerencia', 'Consulta reportes ejecutivos'),
('Soporte', 'Atiende incidencias'),
('Contabilidad', 'Valida pagos y facturacion'),
('Logistica', 'Coordina despachos'),
('Consulta', 'Acceso de solo lectura');

-- Los usuarios se crean mediante la API y el seed_admin() del backend.
-- Usuario por defecto: admin@invesys.com / Admin123! (creado automaticamente
-- al iniciar el backend).

insert into categorias(nombre, descripcion) values
('Pantallas', 'Monitores y displays'),
('Perifericos', 'Teclados, mouse y accesorios'),
('Almacenamiento', 'Discos y memorias'),
('Redes', 'Equipos de conectividad'),
('Energia', 'UPS, reguladores y cargadores'),
('Audio', 'Diademas y parlantes'),
('Impresion', 'Impresoras y toners'),
('Componentes', 'Partes internas de computador'),
('Software', 'Licencias digitales'),
('Mobiliario', 'Sillas y escritorios');

insert into proveedores(nit, nombre, correo, telefono, ciudad) values
('900001001', 'TecnoMayoristas SAS', 'ventas@tecnomayoristas.test', '6011111111', 'Bogota'),
('900001002', 'Andes Hardware', 'contacto@andeshw.test', '6042222222', 'Medellin'),
('900001003', 'Pacifico Digital', 'info@pacificodigital.test', '6023333333', 'Cali'),
('900001004', 'Norte Redes', 'comercial@norteredes.test', '6054444444', 'Barranquilla'),
('900001005', 'Energia Pro', 'ventas@energiapro.test', '6075555555', 'Bucaramanga'),
('900001006', 'Audio Center', 'pedidos@audiocenter.test', '6016666666', 'Bogota'),
('900001007', 'Print Colombia', 'soporte@printco.test', '6047777777', 'Medellin'),
('900001008', 'Componentes Uno', 'ventas@componentesuno.test', '6028888888', 'Cali'),
('900001009', 'Licencias Ya', 'licencias@licenciasya.test', '6019999999', 'Bogota'),
('900001010', 'Oficina Total', 'ventas@oficinatotal.test', '6051010101', 'Cartagena');

insert into productos(sku, nombre, categoria_id, precio, stock_actual, stock_minimo) values
('PRD-001', 'Monitor 24 pulgadas', 1, 620000, 18, 5),
('PRD-002', 'Teclado mecanico', 2, 210000, 3, 8),
('PRD-003', 'Disco SSD 1TB', 3, 340000, 25, 10),
('PRD-004', 'Router WiFi 6', 4, 280000, 9, 5),
('PRD-005', 'UPS 1000VA', 5, 520000, 6, 4),
('PRD-006', 'Diadema USB', 6, 95000, 30, 12),
('PRD-007', 'Impresora laser', 7, 890000, 4, 3),
('PRD-008', 'Memoria RAM 16GB', 8, 180000, 14, 10),
('PRD-009', 'Licencia ofimatica', 9, 150000, 50, 20),
('PRD-010', 'Silla ergonomica', 10, 760000, 7, 4);

insert into producto_proveedor(producto_id, proveedor_id, costo, dias_entrega, es_principal) values
(1, 1, 480000, 3, true),
(2, 2, 150000, 4, true),
(3, 3, 260000, 2, true),
(4, 4, 210000, 5, true),
(5, 5, 390000, 6, true),
(6, 6, 70000, 3, true),
(7, 7, 710000, 4, true),
(8, 8, 130000, 2, true),
(9, 9, 90000, 1, true),
(10, 10, 580000, 7, true);

insert into clientes(documento, nombre, correo, telefono, ciudad) values
('CLI-001', 'Comercial Andes', 'compras@andes.test', '3101111111', 'Bogota'),
('CLI-002', 'Tecno Norte', 'admin@tecnonorte.test', '3102222222', 'Medellin'),
('CLI-003', 'Suministros del Valle', 'ventas@valle.test', '3103333333', 'Cali'),
('CLI-004', 'Oficinas Capital', 'contacto@capital.test', '3104444444', 'Bogota'),
('CLI-005', 'Soluciones Caribe', 'compras@caribe.test', '3105555555', 'Cartagena'),
('CLI-006', 'Industria Nova', 'ti@nova.test', '3106666666', 'Bucaramanga'),
('CLI-007', 'Grupo Altura', 'admin@altura.test', '3107777777', 'Pereira'),
('CLI-008', 'DataSur', 'compras@datasur.test', '3108888888', 'Pasto'),
('CLI-009', 'Logistica Centro', 'info@logcentro.test', '3109999999', 'Ibague'),
('CLI-010', 'Colegio Horizonte', 'rectoria@horizonte.test', '3110000000', 'Manizales');

insert into ordenes_venta(cliente_id, estado, fecha, total) values
(1, 'PAGADA', now() - interval '12 days', 1240000),
(2, 'DESPACHADA', now() - interval '11 days', 420000),
(3, 'PENDIENTE', now() - interval '10 days', 1020000),
(4, 'PAGADA', now() - interval '9 days', 280000),
(5, 'ANULADA', now() - interval '8 days', 520000),
(6, 'PAGADA', now() - interval '7 days', 190000),
(7, 'DESPACHADA', now() - interval '6 days', 890000),
(8, 'PAGADA', now() - interval '5 days', 360000),
(9, 'PENDIENTE', now() - interval '4 days', 300000),
(10, 'PAGADA', now() - interval '3 days', 760000);

insert into orden_items(orden_id, producto_id, cantidad, precio_unitario) values
(1, 1, 2, 620000),
(2, 2, 2, 210000),
(3, 3, 3, 340000),
(4, 4, 1, 280000),
(5, 5, 1, 520000),
(6, 6, 2, 95000),
(7, 7, 1, 890000),
(8, 8, 2, 180000),
(9, 9, 2, 150000),
(10, 10, 1, 760000);

insert into movimientos_inventario(producto_id, tipo, cantidad, motivo) values
(1, 'ENTRADA', 20, 'Compra inicial'),
(2, 'SALIDA', 5, 'Venta mostrador'),
(3, 'ENTRADA', 30, 'Reposicion proveedor'),
(4, 'SALIDA', 3, 'Orden cliente'),
(5, 'ENTRADA', 8, 'Compra programada'),
(6, 'SALIDA', 10, 'Venta corporativa'),
(7, 'AJUSTE', 1, 'Conteo fisico'),
(8, 'ENTRADA', 16, 'Compra inicial'),
(9, 'SALIDA', 4, 'Licencias activadas'),
(10, 'ENTRADA', 8, 'Compra inicial');

insert into auditoria(usuario, accion, tabla_afectada, registro_id, valores_anteriores, valores_nuevos) values
('seed', 'INSERT', 'roles', '1', null, '{"nombre":"Administrador"}'),
('seed', 'INSERT', 'usuarios', '1', null, '{"correo":"admin@invesys.com"}'),
('seed', 'INSERT', 'categorias', '1', null, '{"nombre":"Pantallas"}'),
('seed', 'INSERT', 'proveedores', '1', null, '{"nombre":"TecnoMayoristas SAS"}'),
('seed', 'INSERT', 'productos', '1', null, '{"sku":"PRD-001"}'),
('seed', 'INSERT', 'clientes', '1', null, '{"documento":"CLI-001"}'),
('seed', 'INSERT', 'ordenes_venta', '1', null, '{"estado":"PAGADA"}'),
('seed', 'INSERT', 'orden_items', '1', null, '{"cantidad":2}'),
('seed', 'INSERT', 'movimientos_inventario', '1', null, '{"tipo":"ENTRADA"}'),
('seed', 'UPDATE', 'productos', '2', '{"stock_actual":8}', '{"stock_actual":3}');
