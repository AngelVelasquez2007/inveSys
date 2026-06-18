# Scripts SQL

Orden sugerido de ejecucion en PostgreSQL 12+:

1. `ddl/01_schema.sql`
2. `ddl/02_auditoria_triggers.sql`
3. `ddl/03_procedures_functions.sql`
4. `dml/01_seed.sql`
5. `queries/01_consultas_demostracion.sql`

El modelo incluye 11 tablas, una relacion muchos a muchos (`producto_proveedor`), auditoria automatica por triggers, 3 procedimientos almacenados, 3 funciones personalizadas y 10 consultas de demostracion.
