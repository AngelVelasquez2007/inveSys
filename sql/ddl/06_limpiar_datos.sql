-- Limpia todos los datos de la base de datos
TRUNCATE TABLE
    auditoria,
    orden_items,
    ordenes_venta,
    movimientos_inventario,
    producto_proveedor,
    productos,
    clientes,
    proveedores,
    categorias,
    usuarios,
    sucursales,
    empresas,
    configuracion
RESTART IDENTITY CASCADE;

-- Vuelve a insertar la configuración por defecto
INSERT INTO configuracion (clave, valor) VALUES
    ('nombre_plataforma', 'InveSys'),
    ('moneda_simbolo', '$'),
    ('moneda_codigo', 'COP');
