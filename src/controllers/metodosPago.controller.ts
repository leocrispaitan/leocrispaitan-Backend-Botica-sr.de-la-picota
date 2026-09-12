import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Select compartido de método de pago
const METODO_SELECT =
  'id_metodo_pago, nombre_metodo, descripcion, estado_logico, fecha_registro';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/**
 * Obtener el conteo de ventas por método de pago.
 */
const getVentaCountMap = async (): Promise<Map<number, number>> => {
  const { data: ventas, error } = await supabaseAdmin
    .from('venta')
    .select('id_metodo_pago');

  if (error) {
    console.error('❌ Error counting ventas by método de pago:', error);
    return new Map();
  }

  const countMap = new Map<number, number>();
  (ventas || []).forEach((v) => {
    if (v.id_metodo_pago == null) return;
    countMap.set(v.id_metodo_pago, (countMap.get(v.id_metodo_pago) || 0) + 1);
  });

  return countMap;
};

/** Validar campos de método de pago (create/update). Devuelve lista de errores. */
const validateMetodoFields = (body: any): string[] => {
  const errores: string[] = [];
  const nombreMetodo = body?.nombre_metodo ? String(body.nombre_metodo).trim() : '';
  const descripcion = body?.descripcion ? String(body.descripcion).trim() : '';

  if (!nombreMetodo) {
    errores.push('El nombre del método de pago es obligatorio.');
  } else if (nombreMetodo.length > 50) {
    errores.push('El nombre del método de pago no puede superar los 50 caracteres.');
  }

  if (descripcion && descripcion.length > 200) {
    errores.push('La descripción no puede superar los 200 caracteres.');
  }

  return errores;
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER TODOS LOS MÉTODOS DE PAGO
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener todos los métodos de pago con el conteo de ventas asociadas.
 *
 * GET /api/v1/metodos-pago
 */
export const getAllMetodosPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: metodos, error: metodosError } = await supabaseAdmin
      .from('metodo_pago')
      .select(METODO_SELECT)
      .order('nombre_metodo', { ascending: true });

    if (metodosError) {
      console.error('❌ Error fetching métodos de pago:', metodosError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los métodos de pago',
        error: metodosError.message,
      });
      return;
    }

    const countMap = await getVentaCountMap();

    const metodosConConteo = (metodos || []).map((metodo) => ({
      ...metodo,
      total_ventas: countMap.get(metodo.id_metodo_pago) || 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Métodos de pago obtenidos exitosamente',
      data: metodosConConteo,
    });
  } catch (error) {
    console.error('❌ Error in getAllMetodosPago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER MÉTODO DE PAGO POR ID
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener un método de pago por su ID con las ventas asociadas.
 *
 * GET /api/v1/metodos-pago/:id
 */
export const getMetodoPagoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del método de pago no es válido.',
        error: ['El ID del método de pago no es válido.'],
      });
      return;
    }

    const { data: metodo, error: metodoError } = await supabaseAdmin
      .from('metodo_pago')
      .select(METODO_SELECT)
      .eq('id_metodo_pago', id)
      .maybeSingle();

    if (metodoError) {
      console.error('❌ Error fetching método de pago:', metodoError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el método de pago',
        error: metodoError.message,
      });
      return;
    }

    if (!metodo) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el método de pago.',
        error: ['No se encontró el método de pago.'],
      });
      return;
    }

    // Ventas asociadas al método de pago
    const { data: ventas, error: ventasError } = await supabaseAdmin
      .from('venta')
      .select('id_venta, fecha_venta, total_pagar, estado_venta')
      .eq('id_metodo_pago', id)
      .order('fecha_venta', { ascending: false });

    if (ventasError) {
      console.error('❌ Error fetching método de pago ventas:', ventasError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las ventas del método de pago',
        error: ventasError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Método de pago obtenido exitosamente',
      data: {
        ...metodo,
        total_ventas: (ventas || []).length,
        ventas: ventas || [],
      },
    });
  } catch (error) {
    console.error('❌ Error in getMetodoPagoById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR MÉTODO DE PAGO
// ═══════════════════════════════════════════════════════════════════

/**
 * Crear un nuevo método de pago en la tabla `metodo_pago`.
 * Si ya existe uno con el mismo nombre pero inactivo, lo reactiva.
 *
 * POST /api/v1/metodos-pago
 */
export const createMetodoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const errores = validateMetodoFields(req.body || {});
    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // Normalizar a mayúsculas (consistente con el seed de la BD)
    const nombreNormalizado = String(req.body.nombre_metodo).trim().toUpperCase();
    const descripcionNormalizada = req.body.descripcion
      ? String(req.body.descripcion).trim().toUpperCase()
      : null;

    // ─── Verificar si ya existe (en cualquier estado) ───
    const { data: existente } = await supabaseAdmin
      .from('metodo_pago')
      .select('id_metodo_pago, estado_logico')
      .ilike('nombre_metodo', nombreNormalizado)
      .maybeSingle();

    if (existente && existente.estado_logico) {
      res.status(400).json({
        success: false,
        message: 'Ya existe un método de pago con ese nombre.',
        error: ['Ya existe un método de pago con ese nombre.'],
      });
      return;
    }

    // ─── Si existe pero está inactivo: reactivar ───
    if (existente && !existente.estado_logico) {
      const { data: reactivado, error: reactError } = await supabaseAdmin
        .from('metodo_pago')
        .update({
          nombre_metodo: nombreNormalizado,
          descripcion: descripcionNormalizada,
          estado_logico: true,
        })
        .eq('id_metodo_pago', existente.id_metodo_pago)
        .select(METODO_SELECT)
        .single();

      if (reactError) {
        console.error('❌ Error reactivating método de pago:', reactError);
        res.status(400).json({
          success: false,
          message: 'No se pudo reactivar el método de pago. Intenta nuevamente.',
          error: reactError.message,
        });
        return;
      }

      const countMap = await getVentaCountMap();
      res.status(200).json({
        success: true,
        message: 'Método de pago reactivado exitosamente',
        data: {
          ...reactivado,
          total_ventas: countMap.get(reactivado.id_metodo_pago) || 0,
        },
      });
      return;
    }

    // ─── Insertar nuevo método de pago ───
    const { data: metodo, error: insertError } = await supabaseAdmin
      .from('metodo_pago')
      .insert({
        nombre_metodo: nombreNormalizado,
        descripcion: descripcionNormalizada,
        estado_logico: true,
      })
      .select(METODO_SELECT)
      .single();

    if (insertError) {
      console.error('❌ Error inserting método de pago:', insertError);
      if (insertError.message && insertError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un método de pago con ese nombre.',
          error: [insertError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo crear el método de pago. Verifica los datos e inténtalo nuevamente.',
        error: insertError.message,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Método de pago creado exitosamente',
      data: {
        ...metodo,
        total_ventas: 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in createMetodoPago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ACTUALIZAR MÉTODO DE PAGO
// ═══════════════════════════════════════════════════════════════════

/**
 * Actualizar un método de pago existente (nombre_metodo, descripcion y/o estado_logico).
 *
 * PUT /api/v1/metodos-pago/:id
 */
export const updateMetodoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del método de pago no es válido.',
        error: ['El ID del método de pago no es válido.'],
      });
      return;
    }

    const errores = validateMetodoFields(req.body || {});
    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // ─── Verificar que el método exista ───
    const { data: existente } = await supabaseAdmin
      .from('metodo_pago')
      .select('id_metodo_pago, nombre_metodo')
      .eq('id_metodo_pago', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el método de pago a editar.',
        error: ['No se encontró el método de pago a editar.'],
      });
      return;
    }

    const nombreNormalizado = String(req.body.nombre_metodo).trim().toUpperCase();

    // ─── Verificar unicidad con otro método (distinto al id actual) ───
    if (nombreNormalizado !== existente.nombre_metodo) {
      const { data: duplicado } = await supabaseAdmin
        .from('metodo_pago')
        .select('id_metodo_pago, estado_logico')
        .ilike('nombre_metodo', nombreNormalizado)
        .neq('id_metodo_pago', id)
        .maybeSingle();

      if (duplicado) {
        res.status(400).json({
          success: false,
          message: 'Ya existe otro método de pago con ese nombre.',
          error: ['Ya existe otro método de pago con ese nombre.'],
        });
        return;
      }
    }

    // ─── Actualizar ───
    const updatePayload: Record<string, unknown> = {
      nombre_metodo: nombreNormalizado,
      descripcion: req.body.descripcion ? String(req.body.descripcion).trim().toUpperCase() : null,
    };
    if (typeof req.body.estado_logico === 'boolean') {
      updatePayload.estado_logico = req.body.estado_logico;
    }

    const { data: metodo, error: updateError } = await supabaseAdmin
      .from('metodo_pago')
      .update(updatePayload)
      .eq('id_metodo_pago', id)
      .select(METODO_SELECT)
      .single();

    if (updateError) {
      console.error('❌ Error updating método de pago:', updateError);
      if (updateError.message && updateError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un método de pago con ese nombre.',
          error: [updateError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar el método de pago. Intenta nuevamente.',
        error: updateError.message,
      });
      return;
    }

    const countMap = await getVentaCountMap();
    res.status(200).json({
      success: true,
      message: 'Método de pago actualizado exitosamente',
      data: {
        ...metodo,
        total_ventas: countMap.get(id) || 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in updateMetodoPago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ELIMINAR MÉTODO DE PAGO (SOFT DELETE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Eliminar lógicamente un método de pago (estado_logico = false).
 *
 * Se usa soft delete en lugar de un borrado físico porque `venta.id_metodo_pago`
 * tiene ON DELETE RESTRICT: un método usado en ventas no se puede eliminar
 * físicamente sin afectar el historial de ventas.
 *
 * DELETE /api/v1/metodos-pago/:id
 */
export const deleteMetodoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del método de pago no es válido.',
        error: ['El ID del método de pago no es válido.'],
      });
      return;
    }

    const { data: existente } = await supabaseAdmin
      .from('metodo_pago')
      .select('id_metodo_pago')
      .eq('id_metodo_pago', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el método de pago a eliminar.',
        error: ['No se encontró el método de pago a eliminar.'],
      });
      return;
    }

    // ─── Soft delete ───
    const { data: metodo, error: deleteError } = await supabaseAdmin
      .from('metodo_pago')
      .update({ estado_logico: false })
      .eq('id_metodo_pago', id)
      .select(METODO_SELECT)
      .single();

    if (deleteError) {
      console.error('❌ Error deleting método de pago:', deleteError);
      res.status(400).json({
        success: false,
        message: 'No se pudo eliminar el método de pago. Intenta nuevamente.',
        error: deleteError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Método de pago eliminado exitosamente',
      data: metodo,
    });
  } catch (error) {
    console.error('❌ Error in deleteMetodoPago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};