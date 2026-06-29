-- 08_avatar_mensajes_descuentos.sql

-- 1. Avatar (columna en usuarios)
alter table usuarios add column if not exists avatar_url varchar(255);

-- 2. Mensajes del admin a sucursales
create table if not exists mensajes (
  id bigserial primary key,
  remitente_id bigint not null references usuarios(id),
  contenido text not null,
  created_at timestamptz not null default now()
);

create table if not exists mensaje_sucursal (
  mensaje_id bigint not null references mensajes(id) on delete cascade,
  sucursal_id bigint not null references sucursales(id) on delete cascade,
  primary key (mensaje_id, sucursal_id)
);

-- 3. Descuentos / ofertas temporales
create table if not exists descuentos (
  id bigserial primary key,
  titulo varchar(200) not null,
  descripcion text,
  tipo varchar(20) not null check (tipo in ('PORCENTAJE', 'FIJO')),
  valor numeric(10,2) not null check (valor > 0),
  fecha_inicio timestamptz not null default now(),
  fecha_fin timestamptz,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists descuento_sucursal (
  descuento_id bigint not null references descuentos(id) on delete cascade,
  sucursal_id bigint not null references sucursales(id) on delete cascade,
  primary key (descuento_id, sucursal_id)
);
