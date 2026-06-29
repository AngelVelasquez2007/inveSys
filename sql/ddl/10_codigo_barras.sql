-- Agregar campo codigo_barras a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(50) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
