-- Agrega campos para POS: dinero recibido y cambio
ALTER TABLE ordenes_venta
  ADD COLUMN IF NOT EXISTS dinero_recibido NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cambio NUMERIC(12,2);
