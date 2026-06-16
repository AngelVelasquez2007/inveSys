# Diccionario de Datos

## roles
Catalogo de perfiles de acceso. Campos: `id`, `nombre`, `descripcion`, `created_at`.

## usuarios
Usuarios internos del sistema. Campos: `id`, `rol_id`, `nombre`, `correo`, `activo`, `created_at`, `updated_at`.

## categorias
Clasificacion de productos. Campos: `id`, `nombre`, `descripcion`, `created_at`.

## proveedores
Empresas proveedoras. Campos: `id`, `nit`, `nombre`, `correo`, `telefono`, `ciudad`, `activo`, fechas de auditoria operativa.

## productos
Catalogo principal. Campos: `id`, `sku`, `nombre`, `categoria_id`, `precio`, `stock_actual`, `stock_minimo`, `activo`, fechas de creacion y actualizacion.

## producto_proveedor
Relacion muchos a muchos entre productos y proveedores. Campos: `producto_id`, `proveedor_id`, `costo`, `dias_entrega`, `es_principal`, `created_at`.

## clientes
Clientes comerciales. Campos: `id`, `documento`, `nombre`, `correo`, `telefono`, `ciudad`, `activo`, fechas de creacion y actualizacion.

## ordenes_venta
Cabecera de ventas. Campos: `id`, `cliente_id`, `usuario_id`, `estado`, `fecha`, `total`.

## orden_items
Detalle de ventas. Campos: `id`, `orden_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal`.

## movimientos_inventario
Entradas, salidas y ajustes. Campos: `id`, `producto_id`, `tipo`, `cantidad`, `motivo`, `created_at`.

## auditoria
Registro automatico de acciones CRUD. Campos: `id`, `usuario`, `accion`, `tabla_afectada`, `registro_id`, `valores_anteriores`, `valores_nuevos`, `ip_conexion`, `created_at`.
