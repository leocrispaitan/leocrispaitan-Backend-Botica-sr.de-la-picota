import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Select compartido de forma farmacéutica
const FORMA_SELECT =
  'id_forma_farmaceutica, nombre, estado_logico, fecha_registro';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/**
 * Obtener el conteo de productos activos por forma farmacéutica.
 */
const getProductCountMap = async (): Promise<Map<number, number>> => {
  const { data: productos, error } = await supabaseAdmin
    .from('producto')
    .select('id_forma_farmaceutica')
    .eq('estado_logico', true);

  if (error) {
    console.error('❌ Error counting products by forma farmacéutica:', error);
    return new Map();
  }

  const countMap = new Map<number, number>();
  (productos || []).forEach((p) => {
    if (p.id_forma_farmaceutica == null) return;
    countMap.set(p.id_forma_farmaceutica, (countMap.get(p.id_forma_farmaceutica) || 0) + 1);
  });

  return countMap;
};

/** Validar campos de forma farmacéutica (create/update). Devuelve lista de errores. */
const validateFormaFields = (body: any): string[] => {
  const errores: string[] = [];
  const nombre = body?.nombre ? String(body.nombre).trim() : '';

  if (!nombre) {
    errores.push('El nombre de la forma farmacéutica es obligatorio.');
  } else if (nombre.length > 60) {
    errores.push('El nombre de la forma farmacéutica no puede superar los 60 caracteres.');
  }

  return errores;
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER TODAS LAS FORMAS FARMACÉUTICAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener todas las formas farmacéuticas con el conteo de productos
 * activos asociados a cada una.
 *
 * GET /api/v1/formas-farmaceuticas
 */
export const getAllFormasFarmaceuticas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: formas, error: formasError } = await supabaseAdmin
      .from('forma_farmaceutica')
      .select(FORMA_SELECT)
      .order('nombre', { ascending: true });

    if (formasError) {
      console.error('❌ Error fetching formas farmacéuticas:', formasError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las formas farmacéuticas',
        error: formasError.message,
      });
      return;
    }

    const countMap = await getProductCountMap();

    const formasConConteo = (formas || []).map((forma) => ({
      ...forma,
      total_productos: countMap.get(forma.id_forma_farmaceutica) || 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Formas farmacéuticas obtenidas exitosamente',
      data: formasConConteo,
    });
  } catch (error) {
    console.error('❌ Error in getAllFormasFarmaceuticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER FORMA FARMACÉUTICA POR ID
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener una forma farmacéutica por su ID con los productos asociados.
 *
 * GET /api/v1/formas-farmaceuticas/:id
 */
export const getFormaFarmaceuticaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la forma farmacéutica no es válido.',
        error: ['El ID de la forma farmacéutica no es válido.'],
      });
      return;
    }

    const { data: forma, error: formaError } = await supabaseAdmin
      .from('forma_farmaceutica')
      .select(FORMA_SELECT)
      .eq('id_forma_farmaceutica', id)
      .maybeSingle();

    if (formaError) {
      console.error('❌ Error fetching forma farmacéutica:', formaError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la forma farmacéutica',
        error: formaError.message,
      });
      return;
    }

    if (!forma) {
      res.status(404).json({
        success: false,
        message: 'No se encontró la forma farmacéutica.',
        error: ['No se encontró la forma farmacéutica.'],
      });
      return;
    }

    // Productos asociados a la forma farmacéutica
    const { data: productos, error: prodError } = await supabaseAdmin
      .from('producto')
      .select(`
        id_producto,
        nombre_comercial,
        nombre_generico,
        precio_venta,
        estado_logico
      `)
      .eq('id_forma_farmaceutica', id)
      .order('nombre_comercial', { ascending: true });

    if (prodError) {
      console.error('❌ Error fetching forma farmacéutica products:', prodError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los productos de la forma farmacéutica',
        error: prodError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Forma farmacéutica obtenida exitosamente',
      data: {
        ...forma,
        total_productos: (productos || []).filter((p) => p.estado_logico).length,
        productos: productos || [],
      },
    });
  } catch (error) {
    console.error('❌ Error in getFormaFarmaceuticaById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR FORMA FARMACÉUTICA
// ═══════════════════════════════════════════════════════════════════

/**
 * Crear una nueva forma farmacéutica en la tabla `forma_farmaceutica`.
 * Si ya existe una con el mismo nombre pero inactiva, la reactiva.
 *
 * POST /api/v1/formas-farmaceuticas
 */
export const createFormaFarmaceutica = async (req: Request, res: Response): Promise<void> => {
  try {
    const errores = validateFormaFields(req.body || {});
    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // Normalizar nombre a mayúsculas (consistente con el seed de la BD)
    const nombreNormalizado = String(req.body.nombre).trim().toUpperCase();

    // ─── Verificar si ya existe (en cualquier estado) ───
    const { data: existente } = await supabaseAdmin
      .from('forma_farmaceutica')
      .select('id_forma_farmaceutica, estado_logico')
      .ilike('nombre', nombreNormalizado)
      .maybeSingle();

    if (existente && existente.estado_logico) {
      res.status(400).json({
        success: false,
        message: 'Ya existe una forma farmacéutica con ese nombre.',
        error: ['Ya existe una forma farmacéutica con ese nombre.'],
      });
      return;
    }

    // ─── Si existe pero está inactiva: reactivar ───
    if (existente && !existente.estado_logico) {
      const { data: reactivada, error: reactError } = await supabaseAdmin
        .from('forma_farmaceutica')
        .update({ nombre: nombreNormalizado, estado_logico: true })
        .eq('id_forma_farmaceutica', existente.id_forma_farmaceutica)
        .select(FORMA_SELECT)
        .single();

      if (reactError) {
        console.error('❌ Error reactivating forma farmacéutica:', reactError);
        res.status(400).json({
          success: false,
          message: 'No se pudo reactivar la forma farmacéutica. Intenta nuevamente.',
          error: reactError.message,
        });
        return;
      }

      const countMap = await getProductCountMap();
      res.status(200).json({
        success: true,
        message: 'Forma farmacéutica reactivada exitosamente',
        data: {
          ...reactivada,
          total_productos: countMap.get(reactivada.id_forma_farmaceutica) || 0,
        },
      });
      return;
    }

    // ─── Insertar nueva forma farmacéutica ───
    const { data: forma, error: insertError } = await supabaseAdmin
      .from('forma_farmaceutica')
      .insert({ nombre: nombreNormalizado, estado_logico: true })
      .select(FORMA_SELECT)
      .single();

    if (insertError) {
      console.error('❌ Error inserting forma farmacéutica:', insertError);
      if (insertError.message && insertError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe una forma farmacéutica con ese nombre.',
          error: [insertError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo crear la forma farmacéutica. Verifica los datos e inténtalo nuevamente.',
        error: insertError.message,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Forma farmacéutica creada exitosamente',
      data: {
        ...forma,
        total_productos: 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in createFormaFarmaceutica:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ACTUALIZAR FORMA FARMACÉUTICA
// ═══════════════════════════════════════════════════════════════════

/**
 * Actualizar una forma farmacéutica existente (nombre y/o estado_logico).
 *
 * PUT /api/v1/formas-farmaceuticas/:id
 */
export const updateFormaFarmaceutica = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la forma farmacéutica no es válido.',
        error: ['El ID de la forma farmacéutica no es válido.'],
      });
      return;
    }

    const errores = validateFormaFields(req.body || {});
    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // ─── Verificar que la forma exista ───
    const { data: existente } = await supabaseAdmin
      .from('forma_farmaceutica')
      .select('id_forma_farmaceutica, nombre')
      .eq('id_forma_farmaceutica', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró la forma farmacéutica a editar.',
        error: ['No se encontró la forma farmacéutica a editar.'],
      });
      return;
    }

    const nombreNormalizado = String(req.body.nombre).trim().toUpperCase();

    // ─── Verificar unicidad con otra forma (distinta al id actual) ───
    if (nombreNormalizado !== existente.nombre) {
      const { data: duplicado } = await supabaseAdmin
        .from('forma_farmaceutica')
        .select('id_forma_farmaceutica, estado_logico')
        .ilike('nombre', nombreNormalizado)
        .neq('id_forma_farmaceutica', id)
        .maybeSingle();

      if (duplicado) {
        res.status(400).json({
          success: false,
          message: 'Ya existe otra forma farmacéutica con ese nombre.',
          error: ['Ya existe otra forma farmacéutica con ese nombre.'],
        });
        return;
      }
    }

    // ─── Actualizar ───
    const updatePayload: Record<string, unknown> = { nombre: nombreNormalizado };
    if (typeof req.body.estado_logico === 'boolean') {
      updatePayload.estado_logico = req.body.estado_logico;
    }

    const { data: forma, error: updateError } = await supabaseAdmin
      .from('forma_farmaceutica')
      .update(updatePayload)
      .eq('id_forma_farmaceutica', id)
      .select(FORMA_SELECT)
      .single();

    if (updateError) {
      console.error('❌ Error updating forma farmacéutica:', updateError);
      if (updateError.message && updateError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe una forma farmacéutica con ese nombre.',
          error: [updateError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar la forma farmacéutica. Intenta nuevamente.',
        error: updateError.message,
      });
      return;
    }

    const countMap = await getProductCountMap();
    res.status(200).json({
      success: true,
      message: 'Forma farmacéutica actualizada exitosamente',
      data: {
        ...forma,
        total_productos: countMap.get(id) || 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in updateFormaFarmaceutica:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ELIMINAR FORMA FARMACÉUTICA (SOFT DELETE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Eliminar lógicamente una forma farmacéutica (estado_logico = false).
 *
 * Se usa soft delete para conservar el catálogo: `producto.id_forma_farmaceutica`
 * tiene ON DELETE SET NULL, por lo que un borrado físico dejaría los productos
 * sin su forma farmacéutica.
 *
 * DELETE /api/v1/formas-farmaceuticas/:id
 */
export const deleteFormaFarmaceutica = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la forma farmacéutica no es válido.',
        error: ['El ID de la forma farmacéutica no es válido.'],
      });
      return;
    }

    const { data: existente } = await supabaseAdmin
      .from('forma_farmaceutica')
      .select('id_forma_farmaceutica')
      .eq('id_forma_farmaceutica', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró la forma farmacéutica a eliminar.',
        error: ['No se encontró la forma farmacéutica a eliminar.'],
      });
      return;
    }

    // ─── Soft delete ───
    const { data: forma, error: deleteError } = await supabaseAdmin
      .from('forma_farmaceutica')
      .update({ estado_logico: false })
      .eq('id_forma_farmaceutica', id)
      .select(FORMA_SELECT)
      .single();

    if (deleteError) {
      console.error('❌ Error deleting forma farmacéutica:', deleteError);
      res.status(400).json({
        success: false,
        message: 'No se pudo eliminar la forma farmacéutica. Intenta nuevamente.',
        error: deleteError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Forma farmacéutica eliminada exitosamente',
      data: forma,
    });
  } catch (error) {
    console.error('❌ Error in deleteFormaFarmaceutica:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};