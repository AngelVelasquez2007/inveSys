# Modelos de Diseno

## Modelo Entidad-Relacion

```mermaid
erDiagram
  ROLES ||--o{ USUARIOS : asigna
  CATEGORIAS ||--o{ PRODUCTOS : clasifica
  PRODUCTOS ||--o{ PRODUCTO_PROVEEDOR : tiene
  PROVEEDORES ||--o{ PRODUCTO_PROVEEDOR : suministra
  CLIENTES ||--o{ ORDENES_VENTA : realiza
  USUARIOS ||--o{ ORDENES_VENTA : registra
  ORDENES_VENTA ||--o{ ORDEN_ITEMS : contiene
  PRODUCTOS ||--o{ ORDEN_ITEMS : vendido
  PRODUCTOS ||--o{ MOVIMIENTOS_INVENTARIO : mueve
```

## Modelo Relacional

El modelo relacional se encuentra implementado en `sql/ddl/01_schema.sql` con claves primarias, foraneas, restricciones `check`, indices y tabla puente para la relacion N:M.

## Modelo Fisico

PostgreSQL 12+ con tipos `bigserial`, `varchar`, `numeric`, `boolean`, `timestamptz`, `jsonb` e `inet`. La auditoria usa `jsonb` para almacenar valores anteriores y nuevos.
