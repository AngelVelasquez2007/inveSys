-- ============================================================
-- Migration: Roles, Empresas, Sucursales y Configuración
-- ============================================================
-- Ejecutar después de 01_schema.sql → 02 → 03 → 04

-- 1. Tabla de empresas
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo_admin VARCHAR(10) UNIQUE NOT NULL,
    usuario_admin_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabla de sucursales (branch/offices)
CREATE TABLE IF NOT EXISTS sucursales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Tabla de configuración (key-value)
CREATE TABLE IF NOT EXISTS configuracion (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Agregar columnas a usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);

-- 5. Agregar sucursal_id a tablas transaccionales
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
ALTER TABLE ordenes_venta ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sucursal_id INTEGER REFERENCES sucursales(id);

-- 6. Configuración por defecto
INSERT INTO configuracion (clave, valor) VALUES
    ('nombre_plataforma', 'InveSys'),
    ('moneda_simbolo', '$'),
    ('moneda_codigo', 'COP')
ON CONFLICT (clave) DO NOTHING;
