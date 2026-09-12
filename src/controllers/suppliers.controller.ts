import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Select compartido de proveedor
const SUPPLIER_SELECT =
  'id_proveedor, nombre_proveedor, ruc, telefono, email, direccion, estado_logico, fecha_registro';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/**
 * Obtener agregados de compras (movimientos tipo COMPRA) por proveedor:
 * total_compras y monto_total_comprado.
 */
const getPurchaseStatsMap = async (): Promise<
  Map<number, { total_compras: number; monto_total_comprado: number }>
> => {
  const { data: compras, error } = await supabaseAdmin
    .from('movimiento')
    .select('id_proveedor, total')
    .eq('tipo_movimiento', 'COMPRA');

  if (error) {
    console.error('❌ Error fetching purchase stats:', error);
    return new Map();
  }

  const comprasMap = new Map<number, { total_compras: number; monto_total_comprado: number }>();
  (compras || []).forEach((c) => {
    if (c.id_proveedor == null) return;
    const actual = comprasMap.get(c.id_proveedor) || {
      total_compras: 0,
      monto_total_comprado: 0,
    };
    actual.total_compras += 1;
    actual.monto_total_comprado += Number(c.total) || 0;
    comprasMap.set(c.id_proveedor, actual);
  });

  return comprasMap;
};

const mergeStats = (
  proveedor: Record<string, unknown>,
  stats?: { total_compras: number; monto_total_comprado: number }
) => ({
  ...proveedor,
  total_compras: stats?.total_compras ?? 0,
  monto_total_comprado: stats?.monto_total_comprado ?? 0,
});

/** Validar campos de proveedor (create/update). Devuelve lista de errores. */
const validateSupplierFields = (body: any): string[] => {
  const errores: string[] = [];
  const nombre = body?.nombre_proveedor ? String(body.nombre_proveedor).trim() : '';
  const ruc = body?.ruc ? String(body.ruc).trim() : '';
  const email = body?.email ? String(body.email).trim() : '';
  const telefono = body?.telefono ? String(body.telefono).trim() : '';
  const direccion = body?.direccion ? String(body.direccion).trim() : '';

  if (!nombre) {
    errores.push('El nombre del proveedor es obligatorio.');
  } else if (nombre.length > 100) {
    errores.push('El nombre del proveedor no puede superar los 100 caracteres.');
  }

  if (!ruc) {
    errores.push('El RUC es obligatorio.');
  } else if (!/^\d{11}$/.test(ruc)) {
    errores.push('El RUC debe tener exactamente 11 dígitos.');
  }

  if (telefono && telefono.length > 20) {
    errores.push('El teléfono no puede superar los 20 caracteres.');
  }

  if (email) {
    if (email.length > 100) {
      errores.push('El email no puede superar los 100 caracteres.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errores.push('Ingresa un email válido.');
    }
  }

  if (direccion && direccion.length > 200) {
    errores.push('La dirección no puede superar los 200 caracteres.');
  }

  return errores;
};

const buildSupplierPayload = (body: any, withEstado = false): Record<string, unknown> => {
  const nombre = String(body?.nombre_proveedor || '').trim();
  const ruc = String(body?.ruc || '').trim();
  const telefono = body?.telefono ? String(body.telefono).trim() : null;
  const email = body?.email ? String(body.email).trim() : null;
  const direccion = body?.direccion ? String(body.direccion).trim() : null;

  const payload: Record<string, unknown> = {
    nombre_proveedor: nombre,
    ruc,
    telefono,
    email,
    direccion,
  };

  if (withEstado && typeof body?.estado_logico === 'boolean') {
    payload.estado_logico = body.estado_logico;
  }

  return payload;
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER TODOS LOS PROVEEDORES
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener todos los proveedores con estadísticas reales de compra
 * (total de compras y monto total comprado por proveedor).
 *
 * GET /api/v1/suppliers
 */
export const getAllSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: proveedores, error: proveedoresError } = await supabaseAdmin
      .from('proveedor')
      .select(SUPPLIER_SELECT)
      .order('fecha_registro', { ascending: false });

    if (proveedoresError) {
      console.error('❌ Error fetching suppliers:', proveedoresError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los proveedores',
        error: proveedoresError.message,
      });
      return;
    }

    const statsMap = await getPurchaseStatsMap();

    const proveedoresConStats = (proveedores || []).map((p) =>
      mergeStats(p, statsMap.get(p.id_proveedor))
    );

    res.status(200).json({
      success: true,
      message: 'Proveedores obtenidos exitosamente',
      data: proveedoresConStats,
    });
  } catch (error) {
    console.error('❌ Error in getAllSuppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER PROVEEDOR POR ID
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener un proveedor por su ID con estadísticas y productos asociados.
 *
 * GET /api/v1/suppliers/:id
 */
export const getSupplierById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del proveedor no es válido.',
        error: ['El ID del proveedor no es válido.'],
      });
      return;
    }

    const { data: proveedor, error: provError } = await supabaseAdmin
      .from('proveedor')
      .select(SUPPLIER_SELECT)
      .eq('id_proveedor', id)
      .maybeSingle();

    if (provError) {
      console.error('❌ Error fetching supplier:', provError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el proveedor',
        error: provError.message,
      });
      return;
    }

    if (!proveedor) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el proveedor.',
        error: ['No se encontró el proveedor.'],
      });
      return;
    }

    const statsMap = await getPurchaseStatsMap();

    // Productos asociados al proveedor con stock real
    const { data: productos, error: prodError } = await supabaseAdmin
      .from('producto')
      .select(`
        id_producto,
        nombre_comercial,
        nombre_generico,
        precio_venta,
        estado_logico
      `)
      .eq('id_proveedor', id)
      .order('nombre_comercial', { ascending: true });

    if (prodError) {
      console.error('❌ Error fetching supplier products:', prodError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los productos del proveedor',
        error: prodError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Proveedor obtenido exitosamente',
      data: {
        ...mergeStats(proveedor, statsMap.get(id)),
        productos: productos || [],
      },
    });
  } catch (error) {
    console.error('❌ Error in getSupplierById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR PROVEEDOR
// ═══════════════════════════════════════════════════════════════════

/**
 * Crear un nuevo proveedor en la tabla `proveedor`.
 * Si ya existe un proveedor con el mismo RUC pero inactivo,
 * lo reactiva en lugar de crear un duplicado.
 *
 * POST /api/v1/suppliers
 */
export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const errores = validateSupplierFields(req.body || {});
    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    const ruc = String(req.body.ruc).trim();

    // ─── Verificar si ya existe con el mismo RUC (en cualquier estado) ───
    const { data: existente } = await supabaseAdmin
      .from('proveedor')
      .select('id_proveedor, estado_logico')
      .eq('ruc', ruc)
      .maybeSingle();

    if (existente && existente.estado_logico) {
      res.status(400).json({
        success: false,
        message: 'Ya existe un proveedor con ese RUC.',
        error: ['Ya existe un proveedor con ese RUC.'],
      });
      return;
    }

    // ─── Si existe pero está inactivo: reactivar ───
    if (existente && !existente.estado_logico) {
      const { data: reactivado, error: reactError } = await supabaseAdmin
        .from('proveedor')
        .update({ ...buildSupplierPayload(req.body), estado_logico: true })
        .eq('id_proveedor', existente.id_proveedor)
        .select(SUPPLIER_SELECT)
        .single();

      if (reactError) {
        console.error('❌ Error reactivating supplier:', reactError);
        res.status(400).json({
          success: false,
          message: 'No se pudo reactivar el proveedor. Intenta nuevamente.',
          error: reactError.message,
        });
        return;
      }

      const statsMap = await getPurchaseStatsMap();
      res.status(200).json({
        success: true,
        message: 'Proveedor reactivado exitosamente',
        data: mergeStats(reactivado, statsMap.get(reactivado.id_proveedor)),
      });
      return;
    }

    // ─── Insertar nuevo proveedor ───
    const { data: proveedor, error: insertError } = await supabaseAdmin
      .from('proveedor')
      .insert({ ...buildSupplierPayload(req.body), estado_logico: true })
      .select(SUPPLIER_SELECT)
      .single();

    if (insertError) {
      console.error('❌ Error inserting supplier:', insertError);
      if (insertError.message && insertError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un proveedor con ese RUC.',
          error: [insertError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo crear el proveedor. Verifica los datos e inténtalo nuevamente.',
        error: insertError.message,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Proveedor creado exitosamente',
      data: mergeStats(proveedor, { total_compras: 0, monto_total_comprado: 0 }),
    });
  } catch (error) {
    console.error('❌ Error in createSupplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ACTUALIZAR PROVEEDOR
// ═══════════════════════════════════════════════════════════════════

/**
 * Actualizar un proveedor existente (datos y/o estado_logico).
 *
 * PUT /api/v1/suppliers/:id
 */
export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del proveedor no es válido.',
        error: ['El ID del proveedor no es válido.'],
      });
      return;
    }

    const errores = validateSupplierFields(req.body || {});
    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // ─── Verificar que el proveedor exista ───
    const { data: existente } = await supabaseAdmin
      .from('proveedor')
      .select('id_proveedor')
      .eq('id_proveedor', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el proveedor a editar.',
        error: ['No se encontró el proveedor a editar.'],
      });
      return;
    }

    // ─── Verificar unicidad del RUC con otro proveedor ───
    const ruc = String(req.body.ruc).trim();
    const { data: duplicado } = await supabaseAdmin
      .from('proveedor')
      .select('id_proveedor')
      .eq('ruc', ruc)
      .neq('id_proveedor', id)
      .maybeSingle();

    if (duplicado) {
      res.status(400).json({
        success: false,
        message: 'Ya existe otro proveedor con ese RUC.',
        error: ['Ya existe otro proveedor con ese RUC.'],
      });
      return;
    }

    // ─── Actualizar ───
    const { data: proveedor, error: updateError } = await supabaseAdmin
      .from('proveedor')
      .update(buildSupplierPayload(req.body, true))
      .eq('id_proveedor', id)
      .select(SUPPLIER_SELECT)
      .single();

    if (updateError) {
      console.error('❌ Error updating supplier:', updateError);
      if (updateError.message && updateError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un proveedor con ese RUC.',
          error: [updateError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar el proveedor. Intenta nuevamente.',
        error: updateError.message,
      });
      return;
    }

    const statsMap = await getPurchaseStatsMap();
    res.status(200).json({
      success: true,
      message: 'Proveedor actualizado exitosamente',
      data: mergeStats(proveedor, statsMap.get(id)),
    });
  } catch (error) {
    console.error('❌ Error in updateSupplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ELIMINAR PROVEEDOR (SOFT DELETE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Eliminar lógicamente un proveedor (estado_logico = false).
 *
 * Se usa soft delete en lugar de eliminar físicamente porque:
 *  - `producto.id_proveedor` tiene ON DELETE RESTRICT (la BD bloquearía
 *    el borrado si el proveedor tiene productos asociados).
 *  - `movimiento.id_proveedor` tiene ON DELETE SET NULL (el borrado
 *    físico borraría el proveedor del historial de compras).
 *
 * DELETE /api/v1/suppliers/:id
 */
export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del proveedor no es válido.',
        error: ['El ID del proveedor no es válido.'],
      });
      return;
    }

    const { data: existente } = await supabaseAdmin
      .from('proveedor')
      .select('id_proveedor')
      .eq('id_proveedor', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el proveedor a eliminar.',
        error: ['No se encontró el proveedor a eliminar.'],
      });
      return;
    }

    // ─── Soft delete ───
    const { data: proveedor, error: deleteError } = await supabaseAdmin
      .from('proveedor')
      .update({ estado_logico: false })
      .eq('id_proveedor', id)
      .select(SUPPLIER_SELECT)
      .single();

    if (deleteError) {
      console.error('❌ Error deleting supplier:', deleteError);
      res.status(400).json({
        success: false,
        message: 'No se pudo eliminar el proveedor. Intenta nuevamente.',
        error: deleteError.message,
      });
      return;
    }

    const statsMap = await getPurchaseStatsMap();
    res.status(200).json({
      success: true,
      message: 'Proveedor eliminado exitosamente',
      data: mergeStats(proveedor, statsMap.get(id)),
    });
  } catch (error) {
    console.error('❌ Error in deleteSupplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};