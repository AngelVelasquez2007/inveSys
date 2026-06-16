# Proceso de Normalizacion

## 1FN
Todas las tablas tienen columnas atomicas, claves primarias y no almacenan listas dentro de un campo. Por ejemplo, los items de una venta se separan en `orden_items`.

## 2FN
Los atributos dependen de la clave completa. La tabla puente `producto_proveedor` usa clave compuesta y sus atributos (`costo`, `dias_entrega`, `es_principal`) dependen de la relacion completa producto-proveedor.

## 3FN
Se eliminaron dependencias transitivas. Los datos de categoria, proveedor y cliente viven en sus propias tablas; `productos` solo referencia `categoria_id`.

## 4FN
Las relaciones multivaluadas independientes se separaron. Un producto puede tener varios proveedores y un proveedor varios productos mediante `producto_proveedor`, evitando repeticion en `productos`.
