import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Select compartido: filas de inventario_lote con su producto asociado
const LOTE_SELECT = `
  id_inventario,
  id_producto,
  numero_lote,
  fecha_vencimiento,
  fecha_ingreso,
  costo_unitario_compra,
  stock_lote,
  ubicacion_estante,
  estado_logico,
  producto (
    id_producto,
    nombre_comercial,
    nombre_generico
  )
`;

// Umbral (en días) para considerar un lote "por vencer"
const DIAS_POR_VENCER = 90;

/**
 * Calcular los días restantes para el vencimiento de un lote.
 */
const calcularDiasParaVencer = (fechaVencimiento: string | null): number | null => {
  if (!fechaVencimiento) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const vencimiento = new Date(`${fechaVencimiento}T00:00:00`);

  if (Number.isNaN(vencimiento.getTime())) return null;

  const diffMs = vencimiento.getTime() - hoy.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Clasificar un lote según su estado de vencimiento.
 */
const clasificarEstadoVencimiento = (diasParaVencer: number | null): 'vigente' | 'proximo' | 'vencido' => {
  if (diasParaVencer == null) return 'vigente';
  if (diasParaVencer < 0) return 'vencido';
  if (diasParaVencer <= DIAS_POR_VENCER) return 'proximo';
  return 'vigente';
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER TODOS LOS LOTES
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener todos los lotes con su producto asociado y el estado
 * de vencimiento calculado (vigente / proximo / vencido).
 *
 * GET /api/v1/lotes
 */
export const getAllLotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: lotes, error } = await supabaseAdmin
      .from('inventario_lote')
      .select(LOTE_SELECT)
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
      .order('id_inventario', { ascending: false });

    if (error) {
      console.error('❌ Error fetching lotes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los lotes',
        error: error.message,
      });
      return;
    }

    const lotesConEstado = (lotes || []).map((lote) => {
      const diasParaVencer = calcularDiasParaVencer(lote.fecha_vencimiento);
      return {
        ...lote,
        dias_para_vencer: diasParaVencer,
        estado_vencimiento: clasificarEstadoVencimiento(diasParaVencer),
      };
    });

    res.status(200).json({
      success: true,
      message: 'Lotes obtenidos exitosamente',
      data: lotesConEstado,
    });
  } catch (error) {
    console.error('❌ Error in getAllLotes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER LOTE POR ID
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener un lote por su ID con su producto asociado
 * y el estado de vencimiento calculado.
 *
 * GET /api/v1/lotes/:id
 */
export const getLoteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del lote no es válido.',
        error: ['El ID del lote no es válido.'],
      });
      return;
    }

    const { data: lote, error } = await supabaseAdmin
      .from('inventario_lote')
      .select(LOTE_SELECT)
      .eq('id_inventario', id)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching lote:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el lote',
        error: error.message,
      });
      return;
    }

    if (!lote) {
      res.status(404).json({
        success: false,
        message: 'El lote no existe.',
        error: ['El lote no existe.'],
      });
      return;
    }

    const diasParaVencer = calcularDiasParaVencer(lote.fecha_vencimiento);
    const loteConEstado = {
      ...lote,
      dias_para_vencer: diasParaVencer,
      estado_vencimiento: clasificarEstadoVencimiento(diasParaVencer),
    };

    res.status(200).json({
      success: true,
      message: 'Lote obtenido exitosamente',
      data: loteConEstado,
    });
  } catch (error) {
    console.error('❌ Error in getLoteById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR UN NUEVO LOTE
// ═══════════════════════════════════════════════════════════════════

/**
 * Registrar un nuevo lote para un producto en el inventario.
 *
 * POST /api/v1/lotes
 */
export const createLote = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id_producto,
      numero_lote,
      fecha_vencimiento,
      costo_unitario_compra,
      stock_lote,
      ubicacion_estante,
    } = req.body || {};

    const errores: string[] = [];

    // ── Validaciones ──
    if (!Number.isInteger(Number(id_producto)) || Number(id_producto) <= 0) {
      errores.push('El producto es obligatorio.');
    }

    const numeroLoteTrim = (numero_lote || '').toString().trim();
    if (!numeroLoteTrim) {
      errores.push('El número de lote es obligatorio.');
    } else if (numeroLoteTrim.length > 50) {
      errores.push('El número de lote no puede superar los 50 caracteres.');
    }

    if (fecha_vencimiento) {
      const esFechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha_vencimiento) && !Number.isNaN(new Date(`${fecha_vencimiento}T00:00:00`).getTime());
      if (!esFechaValida) {
        errores.push('La fecha de vencimiento no es válida.');
      }
    }

    const costo = Number(costo_unitario_compra);
    if (fechaPendiente(costo) || Number.isNaN(costo) || costo < 0) {
      errores.push('El costo unitario es obligatorio y debe ser mayor o igual a 0.');
    }

    const stock = Number(stock_lote);
    if (fechaPendiente(stock) || !Number.isInteger(stock) || stock < 0) {
      errores.push('El stock es obligatorio y debe ser un número entero mayor o igual a 0.');
    }

    const ubicacionTrim = (ubicacion_estante || '').toString().trim();
    if (ubicacionTrim.length > 50) {
      errores.push('La ubicación del estante no puede superar los 50 caracteres.');
    }

    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: errores[0],
        error: errores,
      });
      return;
    }

    const idProductoFinal = Number(id_producto);

    // ── Verificar que el producto exista ──
    const { data: producto, error: productoError } = await supabaseAdmin
      .from('producto')
      .select('id_producto')
      .eq('id_producto', idProductoFinal)
      .maybeSingle();

    if (productoError) {
      console.error('❌ Error checking product:', productoError);
      res.status(500).json({
        success: false,
        message: 'Error al verificar el producto',
        error: productoError.message,
      });
      return;
    }

    if (!producto) {
      res.status(404).json({
        success: false,
        message: 'El producto seleccionado no existe.',
        error: ['El producto seleccionado no existe.'],
      });
      return;
    }

    // ── Verificar que no exista el lote para ese producto ──
    const { data: existente } = await supabaseAdmin
      .from('inventario_lote')
      .select('id_inventario')
      .eq('id_producto', idProductoFinal)
      .eq('numero_lote', numeroLoteTrim)
      .maybeSingle();

    if (existente) {
      res.status(400).json({
        success: false,
        message: `Ya existe un lote con el número "${numeroLoteTrim}" para este producto.`,
        error: ['Ya existe un lote con ese número para este producto.'],
      });
      return;
    }

    // ── Insertar el lote ──
    const { data: loteCreado, error: insertError } = await supabaseAdmin
      .from('inventario_lote')
      .insert({
        id_producto: idProductoFinal,
        numero_lote: numeroLoteTrim,
        fecha_vencimiento: fecha_vencimiento || null,
        costo_unitario_compra: costo,
        stock_lote: stock,
        ubicacion_estante: ubicacionTrim || null,
      })
      .select(LOTE_SELECT)
      .single();

    if (insertError) {
      console.error('❌ Error creating lote:', insertError);
      res.status(500).json({
        success: false,
        message: 'No se pudo registrar el lote',
        error: insertError.message,
      });
      return;
    }

    const diasParaVencer = calcularDiasParaVencer(loteCreado.fecha_vencimiento);
    const loteConEstado = {
      ...loteCreado,
      dias_para_vencer: diasParaVencer,
      estado_vencimiento: clasificarEstadoVencimiento(diasParaVencer),
    };

    res.status(201).json({
      success: true,
      message: 'Lote registrado exitosamente',
      data: loteConEstado,
    });
  } catch (error) {
    console.error('❌ Error in createLote:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ACTUALIZAR UN LOTE
// ═══════════════════════════════════════════════════════════════════

/**
 * Actualizar la información de un lote existente.
 *
 * PUT /api/v1/lotes/:id
 */
export const updateLote = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del lote no es válido.',
        error: ['El ID del lote no es válido.'],
      });
      return;
    }

    const {
      id_producto,
      numero_lote,
      fecha_vencimiento,
      costo_unitario_compra,
      stock_lote,
      ubicacion_estante,
      estado_logico,
    } = req.body || {};

    const errores: string[] = [];

    // ── Validaciones ──
    if (!Number.isInteger(Number(id_producto)) || Number(id_producto) <= 0) {
      errores.push('El producto es obligatorio.');
    }

    const numeroLoteTrim = (numero_lote || '').toString().trim();
    if (!numeroLoteTrim) {
      errores.push('El número de lote es obligatorio.');
    } else if (numeroLoteTrim.length > 50) {
      errores.push('El número de lote no puede superar los 50 caracteres.');
    }

    if (fecha_vencimiento) {
      const esFechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha_vencimiento) && !Number.isNaN(new Date(`${fecha_vencimiento}T00:00:00`).getTime());
      if (!esFechaValida) {
        errores.push('La fecha de vencimiento no es válida.');
      }
    }

    const costo = Number(costo_unitario_compra);
    if (fechaPendiente(costo) || Number.isNaN(costo) || costo < 0) {
      errores.push('El costo unitario es obligatorio y debe ser mayor o igual a 0.');
    }

    const stock = Number(stock_lote);
    if (fechaPendiente(stock) || !Number.isInteger(stock) || stock < 0) {
      errores.push('El stock es obligatorio y debe ser un número entero mayor o igual a 0.');
    }

    const ubicacionTrim = (ubicacion_estante || '').toString().trim();
    if (ubicacionTrim.length > 50) {
      errores.push('La ubicación del estante no puede superar los 50 caracteres.');
    }

    if (estado_logico !== undefined && typeof estado_logico !== 'boolean') {
      errores.push('El estado del lote no es válido.');
    }

    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: errores[0],
        error: errores,
      });
      return;
    }

    const idProductoFinal = Number(id_producto);

    // ── Verificar que el lote exista ──
    const { data: loteExistente, error: loteError } = await supabaseAdmin
      .from('inventario_lote')
      .select('id_inventario')
      .eq('id_inventario', id)
      .maybeSingle();

    if (loteError) {
      console.error('❌ Error checking lote:', loteError);
      res.status(500).json({
        success: false,
        message: 'Error al verificar el lote',
        error: loteError.message,
      });
      return;
    }

    if (!loteExistente) {
      res.status(404).json({
        success: false,
        message: 'El lote no existe.',
        error: ['El lote no existe.'],
      });
      return;
    }

    // ── Verificar que el producto exista ──
    const { data: producto, error: productoError } = await supabaseAdmin
      .from('producto')
      .select('id_producto')
      .eq('id_producto', idProductoFinal)
      .maybeSingle();

    if (productoError) {
      console.error('❌ Error checking product:', productoError);
      res.status(500).json({
        success: false,
        message: 'Error al verificar el producto',
        error: productoError.message,
      });
      return;
    }

    if (!producto) {
      res.status(404).json({
        success: false,
        message: 'El producto seleccionado no existe.',
        error: ['El producto seleccionado no existe.'],
      });
      return;
    }

    // ── Verificar duplicado (mismo producto + número de lote) ──
    const { data: duplicado } = await supabaseAdmin
      .from('inventario_lote')
      .select('id_inventario')
      .eq('id_producto', idProductoFinal)
      .eq('numero_lote', numeroLoteTrim)
      .neq('id_inventario', id)
      .maybeSingle();

    if (duplicado) {
      res.status(400).json({
        success: false,
        message: `Ya existe un lote con el número "${numeroLoteTrim}" para este producto.`,
        error: ['Ya existe un lote con ese número para este producto.'],
      });
      return;
    }

    // ── Actualizar el lote ──
    const datosActualizar: Record<string, unknown> = {
      id_producto: idProductoFinal,
      numero_lote: numeroLoteTrim,
      fecha_vencimiento: fecha_vencimiento || null,
      costo_unitario_compra: costo,
      stock_lote: stock,
      ubicacion_estante: ubicacionTrim || null,
    };

    if (typeof estado_logico === 'boolean') {
      datosActualizar.estado_logico = estado_logico;
    }

    const { data: loteActualizado, error: updateError } = await supabaseAdmin
      .from('inventario_lote')
      .update(datosActualizar)
      .eq('id_inventario', id)
      .select(LOTE_SELECT)
      .single();

    if (updateError) {
      console.error('❌ Error updating lote:', updateError);
      res.status(500).json({
        success: false,
        message: 'No se pudo actualizar el lote',
        error: updateError.message,
      });
      return;
    }

    const diasParaVencer = calcularDiasParaVencer(loteActualizado.fecha_vencimiento);
    const loteConEstado = {
      ...loteActualizado,
      dias_para_vencer: diasParaVencer,
      estado_vencimiento: clasificarEstadoVencimiento(diasParaVencer),
    };

    res.status(200).json({
      success: true,
      message: 'Lote actualizado exitosamente',
      data: loteConEstado,
    });
  } catch (error) {
    console.error('❌ Error in updateLote:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: DESACTIVAR UN LOTE
// ═══════════════════════════════════════════════════════════════════

/**
 * Desactivar un lote (soft delete: estado_logico = false).
 * Se conserva el registro para no romper ventas y movimientos históricos.
 *
 * DELETE /api/v1/lotes/:id
 */
export const deleteLote = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del lote no es válido.',
        error: ['El ID del lote no es válido.'],
      });
      return;
    }

    // ── Verificar que el lote exista ──
    const { data: loteExistente, error: loteError } = await supabaseAdmin
      .from('inventario_lote')
      .select('id_inventario, estado_logico')
      .eq('id_inventario', id)
      .maybeSingle();

    if (loteError) {
      console.error('❌ Error checking lote:', loteError);
      res.status(500).json({
        success: false,
        message: 'Error al verificar el lote',
        error: loteError.message,
      });
      return;
    }

    if (!loteExistente) {
      res.status(404).json({
        success: false,
        message: 'El lote no existe.',
        error: ['El lote no existe.'],
      });
      return;
    }

    if (!loteExistente.estado_logico) {
      res.status(400).json({
        success: false,
        message: 'El lote ya está desactivado.',
        error: ['El lote ya está desactivado.'],
      });
      return;
    }

    // ── Desactivar el lote ──
    const { data: loteDesactivado, error: deleteError } = await supabaseAdmin
      .from('inventario_lote')
      .update({ estado_logico: false })
      .eq('id_inventario', id)
      .select(LOTE_SELECT)
      .single();

    if (deleteError) {
      console.error('❌ Error deleting lote:', deleteError);
      res.status(500).json({
        success: false,
        message: 'No se pudo desactivar el lote',
        error: deleteError.message,
      });
      return;
    }

    const diasParaVencer = calcularDiasParaVencer(loteDesactivado.fecha_vencimiento);
    const loteConEstado = {
      ...loteDesactivado,
      dias_para_vencer: diasParaVencer,
      estado_vencimiento: clasificarEstadoVencimiento(diasParaVencer),
    };

    res.status(200).json({
      success: true,
      message: 'Lote desactivado exitosamente',
      data: loteConEstado,
    });
  } catch (error) {
    console.error('❌ Error in deleteLote:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Determinar si un valor está vacío (undefined, null o cadena vacía).
 */
const fechaPendiente = (valor: any): boolean => {
  return valor === undefined || valor === null || valor === '';
};