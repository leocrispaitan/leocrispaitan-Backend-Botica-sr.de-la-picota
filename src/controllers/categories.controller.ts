import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Select compartido de categoría
const CATEGORY_SELECT = 'id_categoria, nombre_categoria, descripcion, estado_logico, fecha_registro';

/* ─── Select compartido: categoría con conteo de productos ─── */

/**
 * Obtener el conteo de productos activos por categoría
 */
const getProductCountMap = async (): Promise<Map<number, number>> => {
  const { data: productos, error } = await supabaseAdmin
    .from('producto')
    .select('id_categoria')
    .eq('estado_logico', true);

  if (error) {
    console.error('❌ Error counting products:', error);
    return new Map();
  }

  const countMap = new Map<number, number>();
  (productos || []).forEach((p) => {
    countMap.set(p.id_categoria, (countMap.get(p.id_categoria) || 0) + 1);
  });

  return countMap;
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER TODAS LAS CATEGORÍAS CON CONTEO DE PRODUCTOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener todas las categorías con el conteo de productos activos asociados.
 *
 * GET /api/v1/categories
 */
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Obtener todas las categorías
    const { data: categorias, error: catError } = await supabaseAdmin
      .from('categoria')
      .select(CATEGORY_SELECT)
      .order('nombre_categoria', { ascending: true });

    if (catError) {
      console.error('❌ Error fetching categories:', catError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las categorías',
        error: catError.message,
      });
      return;
    }

    // 2. Contar productos activos por categoría
    const countMap = await getProductCountMap();

    // 3. Fusionar conteo en cada categoría
    const categoriasConConteo = (categorias || []).map((cat) => ({
      ...cat,
      total_productos: countMap.get(cat.id_categoria) || 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Categorías obtenidas exitosamente',
      data: categoriasConConteo,
    });
  } catch (error) {
    console.error('❌ Error in getAllCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER CATEGORÍA POR ID CON DETALLE
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener una categoría por su ID con conteo de productos
 * y el listado de productos asociados con stock real.
 *
 * GET /api/v1/categories/:id
 */
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la categoría no es válido.',
        error: ['El ID de la categoría no es válido.'],
      });
      return;
    }

    // 1. Obtener la categoría
    const { data: categoria, error: catError } = await supabaseAdmin
      .from('categoria')
      .select(CATEGORY_SELECT)
      .eq('id_categoria', id)
      .maybeSingle();

    if (catError) {
      console.error('❌ Error fetching category:', catError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la categoría',
        error: catError.message,
      });
      return;
    }

    if (!categoria) {
      res.status(404).json({
        success: false,
        message: 'No se encontró la categoría.',
        error: ['No se encontró la categoría.'],
      });
      return;
    }

    // 2. Obtener productos de la categoría
    const { data: productos, error: prodError } = await supabaseAdmin
      .from('producto')
      .select(`
        id_producto,
        nombre_comercial,
        nombre_generico,
        precio_venta,
        costo_referencial,
        stock_minimo_alerta,
        estado_logico,
        fecha_registro
      `)
      .eq('id_categoria', id)
      .eq('estado_logico', true)
      .order('nombre_comercial', { ascending: true });

    if (prodError) {
      console.error('❌ Error fetching category products:', prodError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los productos de la categoría',
        error: prodError.message,
      });
      return;
    }

    // 3. Obtener stock real de esos productos
    const { data: stockData, error: stockError } = await supabaseAdmin
      .from('vista_stock_producto')
      .select('id_producto, stock_total_actual, alerta_stock_bajo');

    if (stockError) {
      console.error('❌ Error fetching stock data:', stockError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el stock de los productos',
        error: stockError.message,
      });
      return;
    }

    // 4. Fusionar stock real en cada producto
    const stockMap = new Map<number, { stock_total_actual: number; alerta_stock_bajo: boolean }>();
    (stockData || []).forEach((s) => {
      stockMap.set(s.id_producto, {
        stock_total_actual: s.stock_total_actual ?? 0,
        alerta_stock_bajo: s.alerta_stock_bajo ?? false,
      });
    });

    const productosConStock = (productos || []).map((producto) => {
      const stock = stockMap.get(producto.id_producto);
      return {
        ...producto,
        stock_actual: stock?.stock_total_actual ?? 0,
        alerta_stock_bajo: stock?.alerta_stock_bajo ?? false,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Categoría obtenida exitosamente',
      data: {
        ...categoria,
        total_productos: productosConStock.length,
        productos_activos: productosConStock.filter((p) => p.estado_logico).length,
        productos: productosConStock,
      },
    });
  } catch (error) {
    console.error('❌ Error in getCategoryById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ACTUALIZAR CATEGORÍA
// ═══════════════════════════════════════════════════════════════════

/**
 * Actualizar una categoría existente (nombre y/o descripción).
 *
 * PUT /api/v1/categories/:id
 */
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la categoría no es válido.',
        error: ['El ID de la categoría no es válido.'],
      });
      return;
    }

    const { nombre_categoria, descripcion, estado_logico } = req.body || {};

    // ─── Validación de campos ───
    const errores: string[] = [];
    const nombreLimpio = nombre_categoria ? String(nombre_categoria).trim() : '';

    if (!nombreLimpio) {
      errores.push('El nombre de la categoría es obligatorio.');
    } else if (nombreLimpio.length > 100) {
      errores.push('El nombre de la categoría no puede superar los 100 caracteres.');
    }

    if (descripcion && String(descripcion).trim().length > 500) {
      errores.push('La descripción no puede superar los 500 caracteres.');
    }

    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // ─── Verificar que la categoría exista ───
    const { data: existente } = await supabaseAdmin
      .from('categoria')
      .select('id_categoria, nombre_categoria')
      .eq('id_categoria', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró la categoría a editar.',
        error: ['No se encontró la categoría a editar.'],
      });
      return;
    }

    const nombreNormalizado = nombreLimpio.toUpperCase();
    const descripcionLimpia = descripcion && String(descripcion).trim()
      ? String(descripcion).trim()
      : null;

    // ─── Verificar unicidad con otra categoría (distinta al id actual) ───
    if (nombreNormalizado !== existente.nombre_categoria) {
      const { data: duplicado } = await supabaseAdmin
        .from('categoria')
        .select('id_categoria, estado_logico')
        .ilike('nombre_categoria', nombreNormalizado)
        .neq('id_categoria', id)
        .maybeSingle();

      if (duplicado) {
        res.status(400).json({
          success: false,
          message: 'Ya existe otra categoría con ese nombre.',
          error: ['Ya existe otra categoría con ese nombre.'],
        });
        return;
      }
    }

    // ─── Actualizar la categoría ───
    const updatePayload: Record<string, unknown> = {
      nombre_categoria: nombreNormalizado,
      descripcion: descripcionLimpia,
    };

    if (typeof estado_logico === 'boolean') {
      updatePayload.estado_logico = estado_logico;
    }

    const { data: categoria, error: updateError } = await supabaseAdmin
      .from('categoria')
      .update(updatePayload)
      .eq('id_categoria', id)
      .select(CATEGORY_SELECT)
      .single();

    if (updateError) {
      console.error('❌ Error updating category:', updateError);
      if (updateError.message && updateError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre.',
          error: [updateError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar la categoría. Intenta nuevamente.',
        error: updateError.message,
      });
      return;
    }

    // ─── Conteo de productos para la categoría actualizada ───
    const countMap = await getProductCountMap();

    res.status(200).json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: {
        ...categoria,
        total_productos: countMap.get(id) || 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in updateCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ELIMINAR CATEGORÍA (SOFT DELETE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Eliminar lógicamente una categoría (estado_logico = false).
 *
 * DELETE /api/v1/categories/:id
 */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la categoría no es válido.',
        error: ['El ID de la categoría no es válido.'],
      });
      return;
    }

    // ─── Verificar que la categoría exista ───
    const { data: existente } = await supabaseAdmin
      .from('categoria')
      .select('id_categoria')
      .eq('id_categoria', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró la categoría a eliminar.',
        error: ['No se encontró la categoría a eliminar.'],
      });
      return;
    }

    // ─── Soft delete ───
    const { data: categoria, error: deleteError } = await supabaseAdmin
      .from('categoria')
      .update({ estado_logico: false })
      .eq('id_categoria', id)
      .select(CATEGORY_SELECT)
      .single();

    if (deleteError) {
      console.error('❌ Error deleting category:', deleteError);
      res.status(400).json({
        success: false,
        message: 'No se pudo eliminar la categoría. Intenta nuevamente.',
        error: deleteError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Categoría eliminada exitosamente',
      data: categoria,
    });
  } catch (error) {
    console.error('❌ Error in deleteCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR CATEGORÍA
// ═══════════════════════════════════════════════════════════════════

/**
 * Crear una nueva categoría en la tabla `categoria`.
 * Si ya existe una categoría con el mismo nombre pero inactiva,
 * la reactiva en lugar de crear un duplicado.
 *
 * POST /api/v1/categories
 */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre_categoria, descripcion } = req.body || {};

    // ─── Validación de campos ───
    const errores: string[] = [];
    const nombreLimpio = nombre_categoria ? String(nombre_categoria).trim() : '';

    if (!nombreLimpio) {
      errores.push('El nombre de la categoría es obligatorio.');
    } else if (nombreLimpio.length > 100) {
      errores.push('El nombre de la categoría no puede superar los 100 caracteres.');
    }

    if (descripcion && String(descripcion).trim().length > 500) {
      errores.push('La descripción no puede superar los 500 caracteres.');
    }

    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // Normalizar nombre a mayúsculas (consistente con el seed de la BD)
    const nombreNormalizado = nombreLimpio.toUpperCase();
    const descripcionLimpia = descripcion && String(descripcion).trim()
      ? String(descripcion).trim()
      : null;

    // ─── Verificar si ya existe (en cualquier estado) ───
    const { data: existente } = await supabaseAdmin
      .from('categoria')
      .select('id_categoria, estado_logico')
      .ilike('nombre_categoria', nombreNormalizado)
      .maybeSingle();

    if (existente && existente.estado_logico) {
      res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre.',
        error: ['Ya existe una categoría con ese nombre.'],
      });
      return;
    }

    // ─── Si existe pero está inactiva: reactivar ───
    if (existente && !existente.estado_logico) {
      const { data: reactivada, error: reactError } = await supabaseAdmin
        .from('categoria')
        .update({
          nombre_categoria: nombreNormalizado,
          descripcion: descripcionLimpia,
          estado_logico: true,
        })
        .eq('id_categoria', existente.id_categoria)
        .select(CATEGORY_SELECT)
        .single();

      if (reactError) {
        console.error('❌ Error reactivating category:', reactError);
        res.status(400).json({
          success: false,
          message: 'No se pudo reactivar la categoría. Intenta nuevamente.',
          error: reactError.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Categoría reactivada exitosamente',
        data: {
          ...reactivada,
          total_productos: 0,
        },
      });
      return;
    }

    // ─── Insertar nueva categoría ───
    const { data: categoria, error: insertError } = await supabaseAdmin
      .from('categoria')
      .insert({
        nombre_categoria: nombreNormalizado,
        descripcion: descripcionLimpia,
        estado_logico: true,
      })
      .select(CATEGORY_SELECT)
      .single();

    if (insertError) {
      console.error('❌ Error inserting category:', insertError);
      // Manejar violación de unicidad
      if (insertError.message && insertError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre.',
          error: [insertError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo crear la categoría. Verifica los datos e inténtalo nuevamente.',
        error: insertError.message,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: {
        ...categoria,
        total_productos: 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in createCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
