-- =====================================================================
-- Migración: Agregar fecha_registro a la tabla laboratorio
-- =====================================================================
-- La tabla laboratorio no registraba la fecha de creación
-- (solo tenía id_laboratorio, nombre, pais, tipo_entidad y estado_logico).
-- Esta migración agrega la columna para que el módulo de Laboratorios
-- pueda mostrarla con datos reales.

-- 1. Agregar columna fecha_registro
--    - DEFAULT CURRENT_TIMESTAMP: las filas existentes quedan con la fecha
--      de aplicación de la migración y las nuevas con su fecha real.
--    - NOT NULL para que siempre exista una fecha.
ALTER TABLE public.laboratorio
  ADD COLUMN IF NOT EXISTS fecha_registro timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- 2. Índice para ordenar por fecha (opcional, útil si hay muchos registros)
CREATE INDEX IF NOT EXISTS idx_laboratorio_fecha_registro
  ON public.laboratorio (fecha_registro);

-- =====================================================================
-- Listo. Ahora laboratorio registra la fecha de cada registro.
-- =====================================================================