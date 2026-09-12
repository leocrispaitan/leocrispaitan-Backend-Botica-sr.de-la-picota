-- =====================================================================
-- Migración: Agregar fecha_registro a la tabla metodo_pago
-- =====================================================================
-- La tabla metodo_pago no registraba la fecha de creación
-- (solo tenía id_metodo_pago, nombre_metodo, descripcion y estado_logico).
-- Esta migración agrega la columna para que el módulo de Métodos de Pago
-- pueda mostrarla con datos reales.

-- 1. Agregar columna fecha_registro
--    - DEFAULT CURRENT_TIMESTAMP: las filas existentes quedan con la fecha
--      de aplicación de la migración y las nuevas con su fecha real.
--    - NOT NULL para que siempre exista una fecha.
ALTER TABLE public.metodo_pago
  ADD COLUMN IF NOT EXISTS fecha_registro timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- 2. Índice para ordenar por fecha (opcional, útil si hay muchos registros)
CREATE INDEX IF NOT EXISTS idx_metodo_pago_fecha_registro
  ON public.metodo_pago (fecha_registro);

-- =====================================================================
-- Listo. Ahora metodo_pago registra la fecha de cada registro.
-- =====================================================================