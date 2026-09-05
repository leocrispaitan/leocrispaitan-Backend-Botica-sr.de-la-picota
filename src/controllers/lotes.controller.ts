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

/**
 * Determinar si un valor está vacío (undefined, null o cadena vacía).
 */
const fechaPendiente = (valor: any): boolean => {
  return valor === undefined || valor === null || valor === '';
};