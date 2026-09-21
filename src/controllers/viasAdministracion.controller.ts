import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { emitChange } from '../sockets';

// Select compartido de vía de administración
const VIA_SELECT = 'id_via_administracion, nombre, estado_logico, fecha_registro';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/**
 * Obtener el conteo de productos activos por vía de administración.
 */
const getProductCountMap = async (): Promise<Map<number, number>> => {
  const { data: productos, error } = await supabaseAdmin
    .from('producto')
    .select('id_via_administracion')
    .eq('estado_logico', true);

  if (error) {
    console.error('❌ Error counting products by vía de administración:', error);
    return new Map();
  }

  const countMap = new Map<number, number>();
  (productos || []).forEach((p) => {
    if (p.id_via_administracion == null) return;
    countMap.set(p.id_via_administracion, (countMap.get(p.id_via_administracion) || 0) + 1);
  });

  return countMap;
};

/** Validar campos de vía de administración (create/update). Devuelve lista de errores. */
const validateViaFields = (body: any): string[] => {
  const errores: string[] = [];
  const nombre = body?.nombre ? String(body.nombre).trim() : '';

  if (!nombre) {
    errores.push('El nombre de la vía de administración es obligatorio.');
  } else if (nombre.length > 60) {
    errores.push('El nombre de la vía de administración no puede superar los 60 caracteres.');
  }

  return errores;
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER TODAS LAS VÍAS DE ADMINISTRACIÓN
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener todas las vías de administración con el conteo de productos
 * activos asociados a cada una.
 *
 * GET /api/v1/vias-administracion
 */
export const getAllViasAdministracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: vias, error: viasError } = await supabaseAdmin
      .from('via_administracion')
      .select(VIA_SELECT)
      .order('nombre', { ascending: true });

    if (viasError) {
      console.error('❌ Error fetching vías de administración:', viasError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las vías de administración',
        error: viasError.message,
      });
      return;
    }

    const countMap = await getProductCountMap();

    const viasConConteo = (vias || []).map((via) => ({
      ...via,
      total_productos: countMap.get(via.id_via_administracion) || 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Vías de administración obtenidas exitosamente',
      data: viasConConteo,
    });
  } catch (error) {
    console.error('❌ Error in getAllViasAdministracion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER VÍA DE ADMINISTRACIÓN POR ID
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener una vía de administración por su ID con los productos asociados.
 *
 * GET /api/v1/vias-administracion/:id
 */
export const getViaAdministracionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la vía de administración no es válido.',
        error: ['El ID de la vía de administración no es válido.'],
      });
      return;
    }

    const { data: via, error: viaError } = await supabaseAdmin
      .from('via_administracion')
      .select(VIA_SELECT)
      .eq('id_via_administracion', id)
      .maybeSingle();

    if (viaError) {
      console.error('❌ Error fetching vía de administración:', viaError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la vía de administración',
        error: viaError.message,
      });
      return;
    }

    if (!via) {
      res.status(404).json({
        success: false,
        message: 'No se encontró la vía de administración.',
        error: ['No se encontró la vía de administración.'],
      });
      return;
    }

    // Productos asociados a la vía de administración
    const { data: productos, error: prodError } = await supabaseAdmin
      .from('producto')
      .select(`
        id_producto,
        nombre_comercial,
        nombre_generico,
        precio_venta,
        estado_logico
      `)
      .eq('id_via_administracion', id)
      .order('nombre_comercial', { ascending: true });

    if (prodError) {
      console.error('❌ Error fetching vía de administración products:', prodError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los productos de la vía de administración',
        error: prodError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Vía de administración obtenida exitosamente',
      data: {
        ...via,
        total_productos: (productos || []).filter((p) => p.estado_logico).length,
        productos: productos || [],
      },
    });
  } catch (error) {
    console.error('❌ Error in getViaAdministracionById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR VÍA DE ADMINISTRACIÓN
// ═══════════════════════════════════════════════════════════════════

/**
 * Crear una nueva vía de administración en la tabla `via_administracion`.
 * Si ya existe una con el mismo nombre pero inactiva, la reactiva.
 *
 * POST /api/v1/vias-administracion
 */
export const createViaAdministracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const errores = validateViaFields(req.body || {});
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
      .from('via_administracion')
      .select('id_via_administracion, estado_logico')
      .ilike('nombre', nombreNormalizado)
      .maybeSingle();

    if (existente && existente.estado_logico) {
      res.status(400).json({
        success: false,
        message: 'Ya existe una vía de administración con ese nombre.',
        error: ['Ya existe una vía de administración con ese nombre.'],
      });
      return;
    }

    // ─── Si existe pero está inactiva: reactivar ───
    if (existente && !existente.estado_logico) {
      const { data: reactivada, error: reactError } = await supabaseAdmin
        .from('via_administracion')
        .update({ nombre: nombreNormalizado, estado_logico: true })
        .eq('id_via_administracion', existente.id_via_administracion)
        .select(VIA_SELECT)
        .single();

      if (reactError) {
        console.error('❌ Error reactivating vía de administración:', reactError);
        res.status(400).json({
          success: false,
          message: 'No se pudo reactivar la vía de administración. Intenta nuevamente.',
          error: reactError.message,
        });
        return;
      }

      const countMap = await getProductCountMap();
      emitChange('viasAdministracion', 'activated', {
        ...reactivada,
        total_productos: countMap.get(reactivada.id_via_administracion) || 0,
      });
      res.status(200).json({
        success: true,
        message: 'Vía de administración reactivada exitosamente',
        data: {
          ...reactivada,
          total_productos: countMap.get(reactivada.id_via_administracion) || 0,
        },
      });
      return;
    }

    // ─── Insertar nueva vía de administración ───
    const { data: via, error: insertError } = await supabaseAdmin
      .from('via_administracion')
      .insert({ nombre: nombreNormalizado, estado_logico: true })
      .select(VIA_SELECT)
      .single();

    if (insertError) {
      console.error('❌ Error inserting vía de administración:', insertError);
      if (insertError.message && insertError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe una vía de administración con ese nombre.',
          error: [insertError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo crear la vía de administración. Verifica los datos e inténtalo nuevamente.',
        error: insertError.message,
      });
      return;
    }

    emitChange('viasAdministracion', 'created', { ...via, total_productos: 0 });
    res.status(201).json({
      success: true,
      message: 'Vía de administración creada exitosamente',
      data: {
        ...via,
        total_productos: 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in createViaAdministracion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ACTUALIZAR VÍA DE ADMINISTRACIÓN
// ═══════════════════════════════════════════════════════════════════

/**
 * Actualizar una vía de administración existente (nombre y/o estado_logico).
 *
 * PUT /api/v1/vias-administracion/:id
 */
export const updateViaAdministracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la vía de administración no es válido.',
        error: ['El ID de la vía de administración no es válido.'],
      });
      return;
    }

    const errores = validateViaFields(req.body || {});
    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // ─── Verificar que la vía exista ───
    const { data: existente } = await supabaseAdmin
      .from('via_administracion')
      .select('id_via_administracion, nombre')
      .eq('id_via_administracion', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró la vía de administración a editar.',
        error: ['No se encontró la vía de administración a editar.'],
      });
      return;
    }

    const nombreNormalizado = String(req.body.nombre).trim().toUpperCase();

    // ─── Verificar unicidad con otra vía (distinta al id actual) ───
    if (nombreNormalizado !== existente.nombre) {
      const { data: duplicado } = await supabaseAdmin
        .from('via_administracion')
        .select('id_via_administracion, estado_logico')
        .ilike('nombre', nombreNormalizado)
        .neq('id_via_administracion', id)
        .maybeSingle();

      if (duplicado) {
        res.status(400).json({
          success: false,
          message: 'Ya existe otra vía de administración con ese nombre.',
          error: ['Ya existe otra vía de administración con ese nombre.'],
        });
        return;
      }
    }

    // ─── Actualizar ───
    const updatePayload: Record<string, unknown> = { nombre: nombreNormalizado };
    if (typeof req.body.estado_logico === 'boolean') {
      updatePayload.estado_logico = req.body.estado_logico;
    }

    const { data: via, error: updateError } = await supabaseAdmin
      .from('via_administracion')
      .update(updatePayload)
      .eq('id_via_administracion', id)
      .select(VIA_SELECT)
      .single();

    if (updateError) {
      console.error('❌ Error updating vía de administración:', updateError);
      if (updateError.message && updateError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe una vía de administración con ese nombre.',
          error: [updateError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar la vía de administración. Intenta nuevamente.',
        error: updateError.message,
      });
      return;
    }

    const countMap = await getProductCountMap();
    emitChange('viasAdministracion', 'updated', {
      ...via,
      total_productos: countMap.get(id) || 0,
    });
    res.status(200).json({
      success: true,
      message: 'Vía de administración actualizada exitosamente',
      data: {
        ...via,
        total_productos: countMap.get(id) || 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in updateViaAdministracion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ELIMINAR VÍA DE ADMINISTRACIÓN (SOFT DELETE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Eliminar lógicamente una vía de administración (estado_logico = false).
 *
 * Se usa soft delete para conservar el catálogo: `producto.id_via_administracion`
 * tiene ON DELETE SET NULL, por lo que un borrado físico dejaría los productos
 * sin su vía de administración.
 *
 * DELETE /api/v1/vias-administracion/:id
 */
export const deleteViaAdministracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la vía de administración no es válido.',
        error: ['El ID de la vía de administración no es válido.'],
      });
      return;
    }

    const { data: existente } = await supabaseAdmin
      .from('via_administracion')
      .select('id_via_administracion')
      .eq('id_via_administracion', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró la vía de administración a eliminar.',
        error: ['No se encontró la vía de administración a eliminar.'],
      });
      return;
    }

    // ─── Soft delete ───
    const { data: via, error: deleteError } = await supabaseAdmin
      .from('via_administracion')
      .update({ estado_logico: false })
      .eq('id_via_administracion', id)
      .select(VIA_SELECT)
      .single();

    if (deleteError) {
      console.error('❌ Error deleting vía de administración:', deleteError);
      res.status(400).json({
        success: false,
        message: 'No se pudo eliminar la vía de administración. Intenta nuevamente.',
        error: deleteError.message,
      });
      return;
    }

    emitChange('viasAdministracion', 'updated', via);
    res.status(200).json({
      success: true,
      message: 'Vía de administración eliminada exitosamente',
      data: via,
    });
  } catch (error) {
    console.error('❌ Error in deleteViaAdministracion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};