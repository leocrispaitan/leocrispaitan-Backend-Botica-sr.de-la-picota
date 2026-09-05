import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Select compartido: filas de producto con todas sus relaciones
const PRODUCT_SELECT = `
  id_producto,
  nombre_comercial,
  nombre_generico,
  unidad_medida,
  composicion,
  presentacion,
  precio_venta,
  costo_referencial,
  stock_minimo_alerta,
  imagen_url,
  id_categoria,
  id_proveedor,
  id_forma_farmaceutica,
  id_via_administracion,
  id_condicion_venta,
  codigo_atc,
  id_laboratorio_titular,
  id_fabricante,
  estado_logico,
  fecha_registro,
  categoria (
    id_categoria,
    nombre_categoria,
    descripcion
  ),
  proveedor (
    id_proveedor,
    nombre_proveedor,
    ruc
  ),
  forma_farmaceutica (
    id_forma_farmaceutica,
    nombre
  ),
  condicion_venta (
    id_condicion_venta,
    nombre,
    requiere_receta
  ),
  via_administracion (
    id_via_administracion,
    nombre
  ),
  clasificacion_atc (
    codigo_atc,
    descripcion
  ),
  laboratorio_titular:laboratorio!fk_producto_titular (
    id_laboratorio,
    nombre,
    pais
  ),
  fabricante:laboratorio!fk_producto_fabricante (
    id_laboratorio,
    nombre,
    pais
  )
`;

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER PRODUCTOS CON STOCK REAL
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener todos los productos con sus relaciones y el stock real
 * calculado a partir de los lotes (vista_stock_producto).
 *
 * GET /api/v1/products
 */
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Obtener productos con sus relaciones (categoría, proveedor, etc.)
    const { data: productos, error: productosError } = await supabaseAdmin
      .from('producto')
      .select(PRODUCT_SELECT)
      .order('fecha_registro', { ascending: false });

    if (productosError) {
      console.error('❌ Error fetching products:', productosError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: productosError.message,
      });
      return;
    }

    // 2. Obtener el stock real desde la vista calculada por lotes
    const { data: stockData, error: stockError } = await supabaseAdmin
      .from('vista_stock_producto')
      .select(`
        id_producto,
        stock_total_actual,
        alerta_stock_bajo
      `);

    if (stockError) {
      console.error('❌ Error fetching stock data:', stockError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el stock de los productos',
        error: stockError.message,
      });
      return;
    }

    // 3. Fusionar stock real en cada producto (campo stock_actual)
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
      message: 'Productos obtenidos exitosamente',
      data: productosConStock,
    });
  } catch (error) {
    console.error('❌ Error in getAllProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CATÁLOGO PARA FILTROS
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener catálogos necesarios para los filtros y formularios de productos
 * (categorías, condiciones de venta, proveedores, formas farmacéuticas,
 * vías de administración, laboratorios y clasificaciones ATC).
 *
 * GET /api/v1/products/catalog
 */
export const getProductCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      categoriasResult,
      condicionesResult,
      proveedoresResult,
      formasResult,
      viasResult,
      laboratoriosResult,
      atcResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('categoria')
        .select('id_categoria, nombre_categoria, descripcion')
        .eq('estado_logico', true)
        .order('nombre_categoria', { ascending: true }),
      supabaseAdmin
        .from('condicion_venta')
        .select('id_condicion_venta, nombre, requiere_receta')
        .eq('estado_logico', true)
        .order('id_condicion_venta', { ascending: true }),
      supabaseAdmin
        .from('proveedor')
        .select('id_proveedor, nombre_proveedor, ruc')
        .eq('estado_logico', true)
        .order('nombre_proveedor', { ascending: true }),
      supabaseAdmin
        .from('forma_farmaceutica')
        .select('id_forma_farmaceutica, nombre')
        .eq('estado_logico', true)
        .order('nombre', { ascending: true }),
      supabaseAdmin
        .from('via_administracion')
        .select('id_via_administracion, nombre')
        .eq('estado_logico', true)
        .order('nombre', { ascending: true }),
      supabaseAdmin
        .from('laboratorio')
        .select('id_laboratorio, nombre, pais')
        .eq('estado_logico', true)
        .order('nombre', { ascending: true }),
      supabaseAdmin
        .from('clasificacion_atc')
        .select('codigo_atc, descripcion')
        .eq('estado_logico', true)
        .order('codigo_atc', { ascending: true }),
    ]);

    const allResults = [
      categoriasResult,
      condicionesResult,
      proveedoresResult,
      formasResult,
      viasResult,
      laboratoriosResult,
      atcResult,
    ];
    const firstError = allResults.find((r) => r.error);

    if (firstError) {
      console.error('❌ Error fetching catalog:', firstError.error?.message);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el catálogo de productos',
        error: firstError.error?.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Catálogo obtenido exitosamente',
      data: {
        categorias: categoriasResult.data || [],
        condiciones_venta: condicionesResult.data || [],
        proveedores: proveedoresResult.data || [],
        formas_farmaceuticas: formasResult.data || [],
        vias_administracion: viasResult.data || [],
        laboratorios: laboratoriosResult.data || [],
        clasificaciones_atc: atcResult.data || [],
      },
    });
  } catch (error) {
    console.error('❌ Error in getProductCatalog:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR PRODUCTO
// ═══════════════════════════════════════════════════════════════════

/**
 * Crear un nuevo producto en la tabla `producto`.
 *
 * POST /api/v1/products
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre_comercial,
      nombre_generico,
      unidad_medida,
      composicion,
      presentacion,
      precio_venta,
      costo_referencial,
      stock_minimo_alerta,
      imagen_url,
      id_categoria,
      id_proveedor,
      id_forma_farmaceutica,
      id_via_administracion,
      id_condicion_venta,
      codigo_atc,
      id_laboratorio_titular,
      id_fabricante,
    } = req.body || {};

    // ─── Validación de campos obligatorios ───
    const errores: string[] = [];

    if (!nombre_comercial || !String(nombre_comercial).trim()) {
      errores.push('El nombre comercial es obligatorio.');
    }
    if (!nombre_generico || !String(nombre_generico).trim()) {
      errores.push('El nombre genérico es obligatorio.');
    }
    if (!unidad_medida || !String(unidad_medida).trim()) {
      errores.push('La unidad de medida es obligatoria.');
    }
    if (precio_venta === undefined || precio_venta === null || !(Number(precio_venta) > 0)) {
      errores.push('El precio de venta debe ser mayor a 0.');
    }
    if (costo_referencial === undefined || costo_referencial === null || !(Number(costo_referencial) >= 0)) {
      errores.push('El costo referencial debe ser mayor o igual a 0.');
    }
    if (stock_minimo_alerta === undefined || stock_minimo_alerta === null || !(Number.isInteger(Number(stock_minimo_alerta)) && Number(stock_minimo_alerta) >= 0)) {
      errores.push('El stock mínimo de alerta debe ser un entero mayor o igual a 0.');
    }
    if (!id_categoria || !Number.isInteger(Number(id_categoria)) || Number(id_categoria) <= 0) {
      errores.push('Debe seleccionar una categoría válida.');
    }
    if (!id_proveedor || !Number.isInteger(Number(id_proveedor)) || Number(id_proveedor) <= 0) {
      errores.push('Debe seleccionar un proveedor válido.');
    }

    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // ─── Construcción del payload (incluye solo campos opcionales provistos) ───
    const payload: Record<string, unknown> = {
      nombre_comercial: String(nombre_comercial).trim(),
      nombre_generico: String(nombre_generico).trim(),
      unidad_medida: String(unidad_medida).trim(),
      precio_venta: Number(precio_venta),
      costo_referencial: Number(costo_referencial),
      stock_minimo_alerta: Number(stock_minimo_alerta),
      id_categoria: Number(id_categoria),
      id_proveedor: Number(id_proveedor),
      estado_logico: true,
    };

    if (composicion && String(composicion).trim()) payload.composicion = String(composicion).trim();
    if (presentacion && String(presentacion).trim()) payload.presentacion = String(presentacion).trim();
    if (imagen_url && String(imagen_url).trim()) payload.imagen_url = String(imagen_url).trim();
    if (id_forma_farmaceutica) payload.id_forma_farmaceutica = Number(id_forma_farmaceutica);
    if (id_via_administracion) payload.id_via_administracion = Number(id_via_administracion);
    if (id_condicion_venta) payload.id_condicion_venta = Number(id_condicion_venta);
    if (codigo_atc && String(codigo_atc).trim()) payload.codigo_atc = String(codigo_atc).trim();
    if (id_laboratorio_titular) payload.id_laboratorio_titular = Number(id_laboratorio_titular);
    if (id_fabricante) payload.id_fabricante = Number(id_fabricante);

    // ─── Insertar el producto ───
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('producto')
      .insert(payload)
      .select('id_producto')
      .single();

    if (insertError) {
      console.error('❌ Error inserting product:', insertError);
      res.status(400).json({
        success: false,
        message: 'No se pudo crear el producto. Verifica los datos e inténtalo nuevamente.',
        error: insertError.message,
      });
      return;
    }

    // ─── Obtener el producto completo con relaciones ───
    const { data: producto, error: productoError } = await supabaseAdmin
      .from('producto')
      .select(PRODUCT_SELECT)
      .eq('id_producto', insertData.id_producto)
      .single();

    if (productoError) {
      console.error('❌ Error fetching created product:', productoError);
      res.status(500).json({
        success: false,
        message: 'El producto se creó pero no se pudo recuperar su información.',
        error: productoError.message,
      });
      return;
    }

    // ─── Fusionar stock real (producto nuevo: sin lotes → 0) ───
    const { data: stockData } = await supabaseAdmin
      .from('vista_stock_producto')
      .select('stock_total_actual, alerta_stock_bajo')
      .eq('id_producto', insertData.id_producto)
      .maybeSingle();

    const productoConStock = {
      ...producto,
      stock_actual: stockData?.stock_total_actual ?? 0,
      alerta_stock_bajo: stockData?.alerta_stock_bajo ?? false,
    };

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: productoConStock,
    });
  } catch (error) {
    console.error('❌ Error in createProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ACTUALIZAR PRODUCTO
// ═══════════════════════════════════════════════════════════════════

/**
 * Actualizar un producto existente.
 *
 * PUT /api/v1/products/:id
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del producto no es válido.',
        error: ['El ID del producto no es válido.'],
      });
      return;
    }

    const {
      nombre_comercial,
      nombre_generico,
      unidad_medida,
      composicion,
      presentacion,
      precio_venta,
      costo_referencial,
      stock_minimo_alerta,
      imagen_url,
      id_categoria,
      id_proveedor,
      id_forma_farmaceutica,
      id_via_administracion,
      id_condicion_venta,
      codigo_atc,
      id_laboratorio_titular,
      id_fabricante,
      estado_logico,
    } = req.body || {};

    // ─── Validación de campos obligatorios ───
    const errores: string[] = [];

    if (!nombre_comercial || !String(nombre_comercial).trim()) {
      errores.push('El nombre comercial es obligatorio.');
    }
    if (!nombre_generico || !String(nombre_generico).trim()) {
      errores.push('El nombre genérico es obligatorio.');
    }
    if (!unidad_medida || !String(unidad_medida).trim()) {
      errores.push('La unidad de medida es obligatoria.');
    }
    if (precio_venta === undefined || precio_venta === null || !(Number(precio_venta) > 0)) {
      errores.push('El precio de venta debe ser mayor a 0.');
    }
    if (costo_referencial === undefined || costo_referencial === null || !(Number(costo_referencial) >= 0)) {
      errores.push('El costo referencial debe ser mayor o igual a 0.');
    }
    if (stock_minimo_alerta === undefined || stock_minimo_alerta === null || !(Number.isInteger(Number(stock_minimo_alerta)) && Number(stock_minimo_alerta) >= 0)) {
      errores.push('El stock mínimo de alerta debe ser un entero mayor o igual a 0.');
    }
    if (!id_categoria || !Number.isInteger(Number(id_categoria)) || Number(id_categoria) <= 0) {
      errores.push('Debe seleccionar una categoría válida.');
    }
    if (!id_proveedor || !Number.isInteger(Number(id_proveedor)) || Number(id_proveedor) <= 0) {
      errores.push('Debe seleccionar un proveedor válido.');
    }

    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // ─── Verificar que el producto exista ───
    const { data: existente } = await supabaseAdmin
      .from('producto')
      .select('id_producto')
      .eq('id_producto', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el producto a editar.',
        error: ['No se encontró el producto a editar.'],
      });
      return;
    }

    // ─── Construcción del payload (null para campos opcionales vacíos) ───
    const payload: Record<string, unknown> = {
      nombre_comercial: String(nombre_comercial).trim(),
      nombre_generico: String(nombre_generico).trim(),
      unidad_medida: String(unidad_medida).trim(),
      precio_venta: Number(precio_venta),
      costo_referencial: Number(costo_referencial),
      stock_minimo_alerta: Number(stock_minimo_alerta),
      id_categoria: Number(id_categoria),
      id_proveedor: Number(id_proveedor),
    };

    if (composicion && String(composicion).trim()) payload.composicion = String(composicion).trim();
    else payload.composicion = null;
    if (presentacion && String(presentacion).trim()) payload.presentacion = String(presentacion).trim();
    else payload.presentacion = null;
    if (imagen_url && String(imagen_url).trim()) payload.imagen_url = String(imagen_url).trim();
    else payload.imagen_url = null;
    payload.id_forma_farmaceutica = id_forma_farmaceutica ? Number(id_forma_farmaceutica) : null;
    payload.id_via_administracion = id_via_administracion ? Number(id_via_administracion) : null;
    payload.id_condicion_venta = id_condicion_venta ? Number(id_condicion_venta) : null;
    payload.codigo_atc = codigo_atc && String(codigo_atc).trim() ? String(codigo_atc).trim() : null;
    payload.id_laboratorio_titular = id_laboratorio_titular ? Number(id_laboratorio_titular) : null;
    payload.id_fabricante = id_fabricante ? Number(id_fabricante) : null;
    if (typeof estado_logico === 'boolean') payload.estado_logico = estado_logico;

    // ─── Actualizar el producto ───
    const { error: updateError } = await supabaseAdmin
      .from('producto')
      .update(payload)
      .eq('id_producto', id);

    if (updateError) {
      console.error('❌ Error updating product:', updateError);
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar el producto. Verifica los datos e inténtalo nuevamente.',
        error: updateError.message,
      });
      return;
    }

    // ─── Obtener el producto actualizado con relaciones ───
    const { data: producto, error: productoError } = await supabaseAdmin
      .from('producto')
      .select(PRODUCT_SELECT)
      .eq('id_producto', id)
      .single();

    if (productoError) {
      console.error('❌ Error fetching updated product:', productoError);
      res.status(500).json({
        success: false,
        message: 'El producto se actualizó pero no se pudo recuperar su información.',
        error: productoError.message,
      });
      return;
    }

    // ─── Fusionar stock real ───
    const { data: stockData } = await supabaseAdmin
      .from('vista_stock_producto')
      .select('stock_total_actual, alerta_stock_bajo')
      .eq('id_producto', id)
      .maybeSingle();

    const productoConStock = {
      ...producto,
      stock_actual: stockData?.stock_total_actual ?? 0,
      alerta_stock_bajo: stockData?.alerta_stock_bajo ?? false,
    };

    res.status(200).json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: productoConStock,
    });
  } catch (error) {
    console.error('❌ Error in updateProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ELIMINAR PRODUCTO
// ═══════════════════════════════════════════════════════════════════

/**
 * Eliminar (soft delete) un producto: cambia estado_logico a false.
 *
 * DELETE /api/v1/products/:id
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del producto no es válido.',
        error: ['El ID del producto no es válido.'],
      });
      return;
    }

    // ─── Verificar que el producto exista ───
    const { data: existente } = await supabaseAdmin
      .from('producto')
      .select('id_producto')
      .eq('id_producto', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el producto a eliminar.',
        error: ['No se encontró el producto a eliminar.'],
      });
      return;
    }

    // ─── Soft delete ───
    const { data: producto, error: deleteError } = await supabaseAdmin
      .from('producto')
      .update({ estado_logico: false })
      .eq('id_producto', id)
      .select()
      .single();

    if (deleteError) {
      console.error('❌ Error deleting product:', deleteError);
      res.status(400).json({
        success: false,
        message: 'No se pudo eliminar el producto. Intenta nuevamente.',
        error: deleteError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Producto eliminado exitosamente',
      data: producto,
    });
  } catch (error) {
    console.error('❌ Error in deleteProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};