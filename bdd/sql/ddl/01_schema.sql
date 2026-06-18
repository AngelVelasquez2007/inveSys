create table roles (
  id bigserial primary key,
  nombre varchar(60) not null unique,
  descripcion text,
  created_at timestamptz not null default now()
);

create table usuarios (
  id bigserial primary key,
  nombre varchar(120) not null,
  correo varchar(255) not null unique,
  contrasena_hash varchar(255) not null,
  rol varchar(20) not null default 'OPERADOR'
    check (rol in ('ADMIN', 'OPERADOR')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_usuarios_correo on usuarios(correo);

create table categorias (
  id bigserial primary key,
  nombre varchar(80) not null unique,
  descripcion text,
  created_at timestamptz not null default now()
);

create table proveedores (
  id bigserial primary key,
  nit varchar(30) not null unique,
  nombre varchar(120) not null,
  correo varchar(160) not null unique,
  telefono varchar(30),
  ciudad varchar(80) not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table productos (
  id bigserial primary key,
  sku varchar(30) not null unique,
  nombre varchar(120) not null,
  categoria_id bigint not null references categorias(id),
  precio numeric(12,2) not null check (precio > 0),
  stock_actual integer not null default 0 check (stock_actual >= 0),
  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table producto_proveedor (
  producto_id bigint not null references productos(id) on delete cascade,
  proveedor_id bigint not null references proveedores(id) on delete restrict,
  costo numeric(12,2) not null check (costo > 0),
  dias_entrega integer not null default 3 check (dias_entrega > 0),
  es_principal boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (producto_id, proveedor_id)
);

create table clientes (
  id bigserial primary key,
  documento varchar(30) not null unique,
  nombre varchar(120) not null,
  correo varchar(160) not null unique,
  telefono varchar(30),
  ciudad varchar(80) not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ordenes_venta (
  id bigserial primary key,
  cliente_id bigint not null references clientes(id),
  usuario_id bigint references usuarios(id),
  estado varchar(20) not null default 'PENDIENTE'
    check (estado in ('PENDIENTE', 'PAGADA', 'ANULADA', 'DESPACHADA')),
  fecha timestamptz not null default now(),
  total numeric(14,2) not null default 0 check (total >= 0)
);

create table orden_items (
  id bigserial primary key,
  orden_id bigint not null references ordenes_venta(id) on delete cascade,
  producto_id bigint not null references productos(id),
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario > 0),
  subtotal numeric(14,2) generated always as (cantidad * precio_unitario) stored,
  unique (orden_id, producto_id)
);

create table movimientos_inventario (
  id bigserial primary key,
  producto_id bigint not null references productos(id),
  tipo varchar(20) not null check (tipo in ('ENTRADA', 'SALIDA', 'AJUSTE')),
  cantidad integer not null check (cantidad > 0),
  motivo varchar(160) not null,
  created_at timestamptz not null default now()
);

create table auditoria (
  id bigserial primary key,
  usuario varchar(120) not null default current_user,
  accion varchar(10) not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  tabla_afectada varchar(80) not null,
  registro_id text,
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  ip_conexion inet default inet_client_addr(),
  created_at timestamptz not null default now()
);

create index idx_productos_categoria on productos(categoria_id);
create index idx_productos_stock_bajo on productos(stock_actual, stock_minimo) where activo;
create index idx_movimientos_producto_fecha on movimientos_inventario(producto_id, created_at desc);
create index idx_ordenes_cliente_fecha on ordenes_venta(cliente_id, fecha desc);
create index idx_auditoria_tabla_fecha on auditoria(tabla_afectada, created_at desc);
