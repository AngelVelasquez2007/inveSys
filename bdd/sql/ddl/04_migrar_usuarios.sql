-- Migracion para bases de datos existentes que aun usan el esquema VIEJO de usuarios
-- (con rol_id FK -> roles en lugar de contrasena_hash + rol CHECK).
-- Ejecutar SOLO si ya corriste 01_schema.sql antes de los cambios de junio 2026.

alter table usuarios add column contrasena_hash varchar(255) not null default '';
alter table usuarios add column rol varchar(20) not null default 'OPERADOR'
  check (rol in ('ADMIN', 'OPERADOR'));

alter table usuarios drop column rol_id;

create index if not exists idx_usuarios_correo on usuarios(correo);

-- Luego de ejecutar esto, reinicia el backend para que seed_admin() cree el admin:
-- admin@invesys.com / Admin123!
