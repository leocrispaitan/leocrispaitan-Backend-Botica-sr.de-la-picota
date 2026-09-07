import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest } from '../types';

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: DATOS PARA EL FORMULARIO DE NUEVA COMPRA
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener productos (con stock) y proveedores activos para el
 * formulario de nueva compra.
 *
 * GET /api/v1/purchases/data
 */
export const getPurchaseData = async (req: Request, res: Response): Promise<void> => {
  try {
    const [productosResult, proveedoresResult, metodosPagoResult] = await Promise.all([
      // Productos activos con stock real
      supabaseAdmin
        .from('producto')
        .select(`
          id_producto,
          nombre_comercial,
          nombre_generico,
          unidad_medida,
          costo_referencial,
          precio_venta,
          proveedor (
            id_proveedor,
            nombre_proveedor
          )
        `)
        .eq('estado_logico', true)
        .order('nombre_comercial', { ascending: true }),
      // Proveedores activos
      supabaseAdmin
        .from('proveedor')
        .select('id_proveedor, nombre_proveedor, ruc, telefono, email')
        .eq('estado_logico', true)
        .order('nombre_proveedor', { ascending: true }),
      // Métodos de pago activos
      supabaseAdmin
        .from('metodo_pago')
        .select('id_metodo_pago, nombre_metodo, descripcion')
        .eq('estado_logico', true)
        .order('id_metodo_pago', { ascending: true }),
    ]);

    // Stock real desde la vista
    const { data: stockData } = await supabaseAdmin
      .from('vista_stock_producto')
      .select('id_producto, stock_total_actual');

    const stockMap = new Map<number, number>();
    (stockData || []).forEach((s) => {
      stockMap.set(s.id_producto, s.stock_total_actual ?? 0);
    });

    const allResults = [productosResult, proveedoresResult, metodosPagoResult];
    const firstError = allResults.find((r) => r.error);

    if (firstError) {
      console.error('❌ Error fetching purchase data:', firstError.error?.message);
      res.status(500).json({
        success: false,
        message: 'Error al obtener datos para la compra',
        error: firstError.error?.message,
      });
      return;
    }

    const productosConStock = (productosResult.data || []).map((p) => ({
      ...p,
      stock_actual: stockMap.get(p.id_producto) ?? 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Datos de compra obtenidos exitosamente',
      data: {
        productos: productosConStock,
        proveedores: proveedoresResult.data || [],
        metodos_pago: metodosPagoResult.data || [],
      },
    });
  } catch (error) {
    console.error('❌ Error in getPurchaseData:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR UNA NUEVA COMPRA
// ═══════════════════════════════════════════════════════════════════

/**
 * Registrar una nueva compra. Flujo:
 *   1. Inserta registro en `movimiento` (tipo_movimiento = 'COMPRA')
 *   2. Por cada producto:
 *      a. Verifica/crea lote en `inventario_lote`
 *      b. Inserta detalle en `detalle_movimiento`
 *
 * POST /api/v1/purchases
 */
export const createPurchase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_usuario = req.user?.usuario?.id_usuario;

    if (!id_usuario) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const {
      id_proveedor,
      fecha_compra,
      numero_documento,
      items,
      subtotal,
      igv,
      total,
    } = req.body || {};

    // ─── Validaciones ───
    const errores: string[] = [];

    if (!Number.isInteger(Number(id_proveedor)) || Number(id_proveedor) <= 0) {
      errores.push('El proveedor es obligatorio.');
    }
    if (!numero_documento || !String(numero_documento).trim()) {
      errores.push('El número de documento es obligatorio.');
    }
    if (!Array.isArray(items) || items.length === 0) {
      errores.push('Debe agregar al menos un producto a la compra.');
    }

    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // ─── Verificar que el proveedor exista ───
    const { data: proveedor } = await supabaseAdmin
      .from('proveedor')
      .select('id_proveedor')
      .eq('id_proveedor', Number(id_proveedor))
      .eq('estado_logico', true)
      .maybeSingle();

    if (!proveedor) {
      res.status(404).json({
        success: false,
        message: 'El proveedor seleccionado no existe o está inactivo.',
      });
      return;
    }

    // ─── Validar cada item ───
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!Number.isInteger(Number(item.id_producto)) || Number(item.id_producto) <= 0) {
        errores.push(`Item ${i + 1}: El producto es obligatorio.`);
      }
      if (!Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) <= 0) {
        errores.push(`Item ${i + 1}: La cantidad debe ser un entero mayor a 0.`);
      }
      if (Number(item.precio_unitario) < 0) {
        errores.push(`Item ${i + 1}: El precio unitario no puede ser negativo.`);
      }
      if (!item.numero_lote || !String(item.numero_lote).trim()) {
        errores.push(`Item ${i + 1}: El número de lote es obligatorio.`);
      }
    }

    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación en los items',
        error: errores,
      });
      return;
    }

    // ─── 1. Crear registro de movimiento (COMPRA) ───
    const { data: movimiento, error: movError } = await supabaseAdmin
      .from('movimiento')
      .insert({
        tipo_movimiento: 'COMPRA',
        id_usuario,
        id_proveedor: Number(id_proveedor),
        numero_documento: String(numero_documento).trim(),
        motivo_ajuste: null,
        subtotal: Number(subtotal) || 0,
        igv: Number(igv) || 0,
        total: Number(total) || 0,
      })
      .select('id_movimiento')
      .single();

    if (movError || !movimiento) {
      console.error('❌ Error creating purchase movement:', movError);
      res.status(500).json({
        success: false,
        message: 'No se pudo registrar la compra',
        error: movError?.message,
      });
      return;
    }

    const id_movimiento = movimiento.id_movimiento;
    const detallesInsertados: number[] = [];

    // ─── 2. Procesar cada item ───
    for (const item of items) {
      const id_producto = Number(item.id_producto);
      const cantidad = Number(item.cantidad);
      const costo_unitario = Number(item.precio_unitario);
      const numero_lote = String(item.numero_lote).trim();
      const fecha_vencimiento = item.fecha_vencimiento || null;

      // 2a. Buscar si ya existe un lote para este producto + número de lote
      const { data: loteExistente } = await supabaseAdmin
        .from('inventario_lote')
        .select('id_inventario, stock_lote, fecha_vencimiento')
        .eq('id_producto', id_producto)
        .eq('numero_lote', numero_lote)
        .maybeSingle();

      let id_inventario: number;

      if (loteExistente) {
        // Actualizar stock del lote existente
        const nuevoStock = loteExistente.stock_lote + cantidad;
        const { error: updateLoteError } = await supabaseAdmin
          .from('inventario_lote')
          .update({
            stock_lote: nuevoStock,
            costo_unitario_compra: costo_unitario,
            fecha_vencimiento: fecha_vencimiento || loteExistente.fecha_vencimiento,
          })
          .eq('id_inventario', loteExistente.id_inventario);

        if (updateLoteError) {
          console.error('❌ Error updating lote stock:', updateLoteError);
          res.status(500).json({
            success: false,
            message: `Error al actualizar el lote ${numero_lote} del producto ${id_producto}`,
            error: updateLoteError.message,
          });
          return;
        }

        id_inventario = loteExistente.id_inventario;
      } else {
        // Crear nuevo lote
        const { data: nuevoLote, error: createLoteError } = await supabaseAdmin
          .from('inventario_lote')
          .insert({
            id_producto,
            numero_lote,
            fecha_vencimiento: fecha_vencimiento || null,
            costo_unitario_compra: costo_unitario,
            stock_lote: cantidad,
            ubicacion_estante: null,
          })
          .select('id_inventario')
          .single();

        if (createLoteError || !nuevoLote) {
          console.error('❌ Error creating lote:', createLoteError);
          res.status(500).json({
            success: false,
            message: `Error al crear el lote ${numero_lote} para el producto ${id_producto}`,
            error: createLoteError?.message,
          });
          return;
        }

        id_inventario = nuevoLote.id_inventario;
      }

      // 2b. Insertar detalle del movimiento
      const { error: detError } = await supabaseAdmin
        .from('detalle_movimiento')
        .insert({
          id_movimiento,
          id_producto,
          id_inventario,
          cantidad,
          costo_unitario,
        });

      if (detError) {
        console.error('❌ Error inserting purchase detail:', detError);
        res.status(500).json({
          success: false,
          message: `Error al registrar el detalle del producto ${id_producto}`,
          error: detError.message,
        });
        return;
      }

      detallesInsertados.push(id_producto);
    }

    // ─── 3. Devolver la compra creada ───
    const { data: compraCompleta, error: fetchError } = await supabaseAdmin
      .from('movimiento')
      .select(`
        id_movimiento,
        tipo_movimiento,
        fecha_hora,
        numero_documento,
        subtotal,
        igv,
        total,
        motivo_ajuste,
        proveedor (
          id_proveedor,
          nombre_proveedor,
          ruc
        ),
        usuario (
          id_usuario,
          nombre_completo
        ),
        detalle_movimiento (
          id_detalle_mov,
          id_producto,
          id_inventario,
          cantidad,
          costo_unitario,
          producto (
            id_producto,
            nombre_comercial,
            unidad_medida
          ),
          inventario_lote (
            id_inventario,
            numero_lote,
            fecha_vencimiento
          )
        )
      `)
      .eq('id_movimiento', id_movimiento)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching created purchase:', fetchError);
      res.status(201).json({
        success: true,
        message: 'Compra registrada exitosamente',
        data: { id_movimiento, detalles: detallesInsertados },
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Compra registrada exitosamente',
      data: compraCompleta,
    });
  } catch (error) {
    console.error('❌ Error in createPurchase:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: HISTORIAL DE COMPRAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener el historial de compras con paginación básica.
 *
 * GET /api/v1/purchases?page=1&limit=20
 */
export const getPurchaseHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const search = String(req.query.search || '').trim();
    const proveedorId = Number(req.query.proveedor) || 0;
    const desde = String(req.query.desde || '');
    const hasta = String(req.query.hasta || '');

    // ─── Construir la consulta base con filtros aplicados ───
    const buildBase = () => {
      let q = supabaseAdmin
        .from('movimiento')
        .select('id_movimiento, total, id_proveedor', { count: 'exact' })
        .eq('tipo_movimiento', 'COMPRA');

      if (search) {
        const pattern = `%${search}%`;
        q = q.or(
          `numero_documento.ilike.${pattern},proveedor.nombre_proveedor.ilike.${pattern},proveedor.ruc.ilike.${pattern}`
        );
      }
      if (proveedorId > 0) {
        q = q.eq('id_proveedor', proveedorId);
      }
      if (desde) {
        q = q.gte('fecha_hora', `${desde}T00:00:00`);
      }
      if (hasta) {
        q = q.lte('fecha_hora', `${hasta}T23:59:59`);
      }
      return q;
    };

    // 1. Filas filtradas (sin límite) para paginación y estadísticas
    const { data: filtradas, error: filtradasError, count } = await buildBase();

    if (filtradasError) {
      console.error('❌ Error fetching purchase history:', filtradasError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el historial de compras',
        error: filtradasError.message,
      });
      return;
    }

    const filas = filtradas || [];
    const total_compras = count || filas.length;
    const total_monto = filas.reduce(
      (sum: number, f: { total: number | null }) => sum + (Number(f.total) || 0),
      0
    );
    const proveedores = new Set(
      filas
        .map((f: { id_proveedor: number | null }) => f.id_proveedor)
        .filter((id: number | null): id is number => id != null)
    ).size;

    // 2. Total de productos (suma de cantidades) sobre los movimientos filtrados
    let total_productos = 0;
    if (filas.length > 0) {
      const ids = filas.map((f: { id_movimiento: number }) => f.id_movimiento);
      const { data: detalles, error: detErr } = await supabaseAdmin
        .from('detalle_movimiento')
        .select('cantidad')
        .in('id_movimiento', ids);

      if (!detErr) {
        total_productos = (detalles || []).reduce(
          (sum: number, d: { cantidad: number }) => sum + (Number(d.cantidad) || 0),
          0
        );
      }
    }

    // 3. Obtener las compras de la página actual
    let pageQuery = supabaseAdmin
      .from('movimiento')
      .select(`
        id_movimiento,
        tipo_movimiento,
        fecha_hora,
        numero_documento,
        subtotal,
        igv,
        total,
        proveedor (
          id_proveedor,
          nombre_proveedor,
          ruc
        ),
        usuario (
          id_usuario,
          nombre_completo
        ),
        detalle_movimiento (
          cantidad,
          costo_unitario,
          producto (
            nombre_comercial
          )
        )
      `)
      .eq('tipo_movimiento', 'COMPRA');

    if (search) {
      const pattern = `%${search}%`;
      pageQuery = pageQuery.or(
        `numero_documento.ilike.${pattern},proveedor.nombre_proveedor.ilike.${pattern},proveedor.ruc.ilike.${pattern}`
      );
    }
    if (proveedorId > 0) {
      pageQuery = pageQuery.eq('id_proveedor', proveedorId);
    }
    if (desde) {
      pageQuery = pageQuery.gte('fecha_hora', `${desde}T00:00:00`);
    }
    if (hasta) {
      pageQuery = pageQuery.lte('fecha_hora', `${hasta}T23:59:59`);
    }

    const { data: compras, error } = await pageQuery
      .order('fecha_hora', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching purchase history:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el historial de compras',
        error: error.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Historial de compras obtenido exitosamente',
      data: {
        compras: compras || [],
        pagination: {
          page,
          limit,
          total: total_compras,
          totalPages: Math.ceil(total_compras / limit),
        },
        stats: {
          total_compras,
          total_monto,
          total_productos,
          proveedores,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error in getPurchaseHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: DETALLE DE UNA COMPRA
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener el detalle completo de una compra por su ID.
 *
 * GET /api/v1/purchases/:id
 */
export const getPurchaseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID de la compra no es válido.',
      });
      return;
    }

    const { data: compra, error } = await supabaseAdmin
      .from('movimiento')
      .select(`
        id_movimiento,
        tipo_movimiento,
        fecha_hora,
        numero_documento,
        subtotal,
        igv,
        total,
        motivo_ajuste,
        proveedor (
          id_proveedor,
          nombre_proveedor,
          ruc,
          telefono,
          email
        ),
        usuario (
          id_usuario,
          nombre_completo,
          dni
        ),
        detalle_movimiento (
          id_detalle_mov,
          cantidad,
          costo_unitario,
          producto (
            id_producto,
            nombre_comercial,
            nombre_generico,
            unidad_medida
          ),
          inventario_lote (
            id_inventario,
            numero_lote,
            fecha_vencimiento
          )
        )
      `)
      .eq('id_movimiento', id)
      .eq('tipo_movimiento', 'COMPRA')
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching purchase:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la compra',
        error: error.message,
      });
      return;
    }

    if (!compra) {
      res.status(404).json({
        success: false,
        message: 'La compra no existe.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Compra obtenida exitosamente',
      data: compra,
    });
  } catch (error) {
    console.error('❌ Error in getPurchaseById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
