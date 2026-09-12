-- =====================================================================
-- Migración: Agregar fecha_registro a la tabla forma_farmaceutica
-- =====================================================================
-- La tabla forma_farmaceutica no registraba la fecha de creación
-- (solo tenía id_forma_farmaceutica, nombre y estado_logico).
-- Esta migración agrega la columna para que el módulo de Formas
-- Farmacéuticas pueda mostrarla con datos reales.

-- 1. Agregar columna fecha_registro
--    - DEFAULT CURRENT_TIMESTAMP: las filas existentes quedan con la fecha
--      de aplicación de la migración y las nuevas con su fecha real.
--    - NOT NULL para que siempre exista una fecha.
ALTER TABLE public.forma_farmaceutica
  ADD COLUMN IF NOT EXISTS fecha_registro timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- 2. Índice para ordenar por fecha (opcional, útil si hay muchos registros)
CREATE INDEX IF NOT EXISTS idx_forma_farmaceutica_fecha_registro
  ON public.forma_farmaceutica (fecha_registro);

-- =====================================================================
-- Listo. Ahora forma_farmaceutica registra la fecha de cada registro.
-- =====================================================================