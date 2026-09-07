-- =====================================================================
-- Migración: Agregar campos de compra a la tabla movimiento
-- =====================================================================
-- La tabla movimiento genérica no tiene campos para:
--   - proveedor (quién nos vendió)
--   - número de documento (factura/boleta)
--   - totales (subtotal, igv, total)
-- Esta migración los agrega para soportar el módulo de Compras.

-- 1. Agregar columna id_proveedor (nullable para no romper ventas/ajustes existentes)
ALTER TABLE movimiento
  ADD COLUMN IF NOT EXISTS id_proveedor int;

ALTER TABLE movimiento
  ADD CONSTRAINT fk_movimiento_proveedor
  FOREIGN KEY (id_proveedor)
  REFERENCES proveedor(id_proveedor)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- 2. Número de factura/boleta del proveedor
ALTER TABLE movimiento
  ADD COLUMN IF NOT EXISTS numero_documento varchar(50);

-- 3. Campos financieros de la compra
ALTER TABLE movimiento
  ADD COLUMN IF NOT EXISTS subtotal decimal(10,2) DEFAULT 0;

ALTER TABLE movimiento
  ADD COLUMN IF NOT EXISTS igv decimal(10,2) DEFAULT 0;

ALTER TABLE movimiento
  ADD COLUMN IF NOT EXISTS total decimal(10,2) DEFAULT 0;

-- =====================================================================
-- Listo. Ahora la tabla movimiento tiene los campos necesarios
-- para registrar compras con proveedor, documento y totales.
-- =====================================================================
