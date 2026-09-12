-- =====================================================================
-- Migración: Agregar fecha_registro a la tabla via_administracion
-- =====================================================================
-- La tabla via_administracion no registraba la fecha de creación
-- (solo tenía id_via_administracion, nombre y estado_logico).
-- Esta migración agrega la columna para que el módulo de Vías de
-- Administración pueda mostrarla con datos reales.

-- 1. Agregar columna fecha_registro
--    - DEFAULT CURRENT_TIMESTAMP: las filas existentes quedan con la fecha
--      de aplicación de la migración y las nuevas con su fecha real.
--    - NOT NULL para que siempre exista una fecha.
ALTER TABLE public.via_administracion
  ADD COLUMN IF NOT EXISTS fecha_registro timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- 2. Índice para ordenar por fecha (opcional, útil si hay muchos registros)
CREATE INDEX IF NOT EXISTS idx_via_administracion_fecha_registro
  ON public.via_administracion (fecha_registro);

-- =====================================================================
-- Listo. Ahora via_administracion registra la fecha de cada registro.
-- =====================================================================