import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Select compartido de laboratorio
const LABORATORIO_SELECT =
  'id_laboratorio, nombre, pais, tipo_entidad, estado_logico, fecha_registro';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/**
 * Obtener el conteo de productos activos asociados a cada laboratorio.
 *
 * Un producto puede referenciar un laboratorio como TITULAR (`id_laboratorio_titular`)
 * o como FABRICANTE (`id_fabricante`). Se cuenta cada producto una sola vez
 * por laboratorio (incluso si aparece en ambos roles).
 */
const getProductCountMap = async (): Promise<Map<number, number>> => {
  const { data: productos, error } = await supabaseAdmin
    .from('producto')
    .select('id_producto, id_laboratorio_titular, id_fabricante')
    .eq('estado_logico', true);

  if (error) {
    console.error('❌ Error counting products by laboratorio:', error);
    return new Map();
  }

  const setMap = new Map<number, Set<number>>();
  (productos || []).forEach((p) => {
    [p.id_laboratorio_titular, p.id_fabricante].forEach((labId) => {
      if (labId == null) return;
      if (!setMap.has(labId)) setMap.set(labId, new Set());
      setMap.get(labId)!.add(p.id_producto);
    });
  });

  const countMap = new Map<number, number>();
  setMap.forEach((set, labId) => countMap.set(labId, set.size));
  return countMap;
};

/** Validar campos de laboratorio (create/update). Devuelve lista de errores. */
const validateLaboratorioFields = (body: any): string[] => {
  const errores: string[] = [];
  const nombre = body?.nombre ? String(body.nombre).trim() : '';
  const pais = body?.pais ? String(body.pais).trim() : '';
  const tipoEntidad = body?.tipo_entidad ? String(body.tipo_entidad).trim() : '';

  if (!nombre) {
    errores.push('El nombre del laboratorio es obligatorio.');
  } else if (nombre.length > 150) {
    errores.push('El nombre del laboratorio no puede superar los 150 caracteres.');
  }

  if (pais && pais.length > 80) {
    errores.push('El país no puede superar los 80 caracteres.');
  }

  if (tipoEntidad && tipoEntidad.length > 50) {
    errores.push('El tipo de entidad no puede superar los 50 caracteres.');
  }

  return errores;
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER TODOS LOS LABORATORIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener todos los laboratorios con el conteo de productos activos
 * asociados a cada uno (como titular o fabricante).
 *
 * GET /api/v1/laboratorios
 */
export const getAllLaboratorios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: laboratorios, error: laboratoriosError } = await supabaseAdmin
      .from('laboratorio')
      .select(LABORATORIO_SELECT)
      .order('nombre', { ascending: true });

    if (laboratoriosError) {
      console.error('❌ Error fetching laboratorios:', laboratoriosError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los laboratorios',
        error: laboratoriosError.message,
      });
      return;
    }

    const countMap = await getProductCountMap();

    const laboratoriosConConteo = (laboratorios || []).map((lab) => ({
      ...lab,
      total_productos: countMap.get(lab.id_laboratorio) || 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Laboratorios obtenidos exitosamente',
      data: laboratoriosConConteo,
    });
  } catch (error) {
    console.error('❌ Error in getAllLaboratorios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: OBTENER LABORATORIO POR ID
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener un laboratorio por su ID con los productos asociados.
 *
 * GET /api/v1/laboratorios/:id
 */
export const getLaboratorioById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del laboratorio no es válido.',
        error: ['El ID del laboratorio no es válido.'],
      });
      return;
    }

    const { data: laboratorio, error: laboratorioError } = await supabaseAdmin
      .from('laboratorio')
      .select(LABORATORIO_SELECT)
      .eq('id_laboratorio', id)
      .maybeSingle();

    if (laboratorioError) {
      console.error('❌ Error fetching laboratorio:', laboratorioError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el laboratorio',
        error: laboratorioError.message,
      });
      return;
    }

    if (!laboratorio) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el laboratorio.',
        error: ['No se encontró el laboratorio.'],
      });
      return;
    }

    // Productos asociados al laboratorio (titular o fabricante)
    const { data: productos, error: prodError } = await supabaseAdmin
      .from('producto')
      .select(`
        id_producto,
        nombre_comercial,
        nombre_generico,
        precio_venta,
        estado_logico,
        id_laboratorio_titular,
        id_fabricante
      `)
      .or(`id_laboratorio_titular.eq.${id},id_fabricante.eq.${id}`)
      .order('nombre_comercial', { ascending: true });

    if (prodError) {
      console.error('❌ Error fetching laboratorio products:', prodError);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los productos del laboratorio',
        error: prodError.message,
      });
      return;
    }

    const productosConRol = (productos || []).map((p) => {
      const roles: string[] = [];
      if (p.id_laboratorio_titular === id) roles.push('TITULAR');
      if (p.id_fabricante === id) roles.push('FABRICANTE');
      return {
        id_producto: p.id_producto,
        nombre_comercial: p.nombre_comercial,
        nombre_generico: p.nombre_generico,
        precio_venta: p.precio_venta,
        estado_logico: p.estado_logico,
        rol: roles.join(' - ') || 'ASOCIADO',
      };
    });

    res.status(200).json({
      success: true,
      message: 'Laboratorio obtenido exitosamente',
      data: {
        ...laboratorio,
        total_productos: productosConRol.filter((p) => p.estado_logico).length,
        productos: productosConRol,
      },
    });
  } catch (error) {
    console.error('❌ Error in getLaboratorioById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR LABORATORIO
// ═══════════════════════════════════════════════════════════════════

/**
 * Crear un nuevo laboratorio en la tabla `laboratorio`.
 * Si ya existe uno con el mismo nombre pero inactivo, lo reactiva.
 *
 * POST /api/v1/laboratorios
 */
export const createLaboratorio = async (req: Request, res: Response): Promise<void> => {
  try {
    const errores = validateLaboratorioFields(req.body || {});
    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // Normalizar a mayúsculas (consistente con el seed de la BD)
    const nombreNormalizado = String(req.body.nombre).trim().toUpperCase();
    const paisNormalizado = req.body.pais ? String(req.body.pais).trim().toUpperCase() : null;
    const tipoEntidadNormalizado = req.body.tipo_entidad
      ? String(req.body.tipo_entidad).trim().toUpperCase()
      : null;

    // ─── Verificar si ya existe (en cualquier estado) ───
    const { data: existente } = await supabaseAdmin
      .from('laboratorio')
      .select('id_laboratorio, estado_logico')
      .ilike('nombre', nombreNormalizado)
      .maybeSingle();

    if (existente && existente.estado_logico) {
      res.status(400).json({
        success: false,
        message: 'Ya existe un laboratorio con ese nombre.',
        error: ['Ya existe un laboratorio con ese nombre.'],
      });
      return;
    }

    // ─── Si existe pero está inactivo: reactivar ───
    if (existente && !existente.estado_logico) {
      const { data: reactivado, error: reactError } = await supabaseAdmin
        .from('laboratorio')
        .update({
          nombre: nombreNormalizado,
          pais: paisNormalizado,
          tipo_entidad: tipoEntidadNormalizado,
          estado_logico: true,
        })
        .eq('id_laboratorio', existente.id_laboratorio)
        .select(LABORATORIO_SELECT)
        .single();

      if (reactError) {
        console.error('❌ Error reactivating laboratorio:', reactError);
        res.status(400).json({
          success: false,
          message: 'No se pudo reactivar el laboratorio. Intenta nuevamente.',
          error: reactError.message,
        });
        return;
      }

      const countMap = await getProductCountMap();
      res.status(200).json({
        success: true,
        message: 'Laboratorio reactivado exitosamente',
        data: {
          ...reactivado,
          total_productos: countMap.get(reactivado.id_laboratorio) || 0,
        },
      });
      return;
    }

    // ─── Insertar nuevo laboratorio ───
    const { data: laboratorio, error: insertError } = await supabaseAdmin
      .from('laboratorio')
      .insert({
        nombre: nombreNormalizado,
        pais: paisNormalizado,
        tipo_entidad: tipoEntidadNormalizado,
        estado_logico: true,
      })
      .select(LABORATORIO_SELECT)
      .single();

    if (insertError) {
      console.error('❌ Error inserting laboratorio:', insertError);
      if (insertError.message && insertError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un laboratorio con ese nombre.',
          error: [insertError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo crear el laboratorio. Verifica los datos e inténtalo nuevamente.',
        error: insertError.message,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Laboratorio creado exitosamente',
      data: {
        ...laboratorio,
        total_productos: 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in createLaboratorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ACTUALIZAR LABORATORIO
// ═══════════════════════════════════════════════════════════════════

/**
 * Actualizar un laboratorio existente (nombre, pais, tipo_entidad y/o estado_logico).
 *
 * PUT /api/v1/laboratorios/:id
 */
export const updateLaboratorio = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del laboratorio no es válido.',
        error: ['El ID del laboratorio no es válido.'],
      });
      return;
    }

    const errores = validateLaboratorioFields(req.body || {});
    if (errores.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Error de validación',
        error: errores,
      });
      return;
    }

    // ─── Verificar que el laboratorio exista ───
    const { data: existente } = await supabaseAdmin
      .from('laboratorio')
      .select('id_laboratorio, nombre')
      .eq('id_laboratorio', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el laboratorio a editar.',
        error: ['No se encontró el laboratorio a editar.'],
      });
      return;
    }

    const nombreNormalizado = String(req.body.nombre).trim().toUpperCase();

    // ─── Verificar unicidad con otro laboratorio (distinto al id actual) ───
    if (nombreNormalizado !== existente.nombre) {
      const { data: duplicado } = await supabaseAdmin
        .from('laboratorio')
        .select('id_laboratorio, estado_logico')
        .ilike('nombre', nombreNormalizado)
        .neq('id_laboratorio', id)
        .maybeSingle();

      if (duplicado) {
        res.status(400).json({
          success: false,
          message: 'Ya existe otro laboratorio con ese nombre.',
          error: ['Ya existe otro laboratorio con ese nombre.'],
        });
        return;
      }
    }

    // ─── Actualizar ───
    const updatePayload: Record<string, unknown> = {
      nombre: nombreNormalizado,
      pais: req.body.pais ? String(req.body.pais).trim().toUpperCase() : null,
      tipo_entidad: req.body.tipo_entidad
        ? String(req.body.tipo_entidad).trim().toUpperCase()
        : null,
    };
    if (typeof req.body.estado_logico === 'boolean') {
      updatePayload.estado_logico = req.body.estado_logico;
    }

    const { data: laboratorio, error: updateError } = await supabaseAdmin
      .from('laboratorio')
      .update(updatePayload)
      .eq('id_laboratorio', id)
      .select(LABORATORIO_SELECT)
      .single();

    if (updateError) {
      console.error('❌ Error updating laboratorio:', updateError);
      if (updateError.message && updateError.message.includes('duplicate key')) {
        res.status(400).json({
          success: false,
          message: 'Ya existe un laboratorio con ese nombre.',
          error: [updateError.message],
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar el laboratorio. Intenta nuevamente.',
        error: updateError.message,
      });
      return;
    }

    const countMap = await getProductCountMap();
    res.status(200).json({
      success: true,
      message: 'Laboratorio actualizado exitosamente',
      data: {
        ...laboratorio,
        total_productos: countMap.get(id) || 0,
      },
    });
  } catch (error) {
    console.error('❌ Error in updateLaboratorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: ELIMINAR LABORATORIO (SOFT DELETE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Eliminar lógicamente un laboratorio (estado_logico = false).
 *
 * Se usa soft delete para conservar el catálogo: `producto.id_laboratorio_titular`
 * e `producto.id_fabricante` tienen ON DELETE SET NULL, por lo que un borrado
 * físico dejaría los productos sin su laboratorio de referencia.
 *
 * DELETE /api/v1/laboratorios/:id
 */
export const deleteLaboratorio = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: 'El ID del laboratorio no es válido.',
        error: ['El ID del laboratorio no es válido.'],
      });
      return;
    }

    const { data: existente } = await supabaseAdmin
      .from('laboratorio')
      .select('id_laboratorio')
      .eq('id_laboratorio', id)
      .maybeSingle();

    if (!existente) {
      res.status(404).json({
        success: false,
        message: 'No se encontró el laboratorio a eliminar.',
        error: ['No se encontró el laboratorio a eliminar.'],
      });
      return;
    }

    // ─── Soft delete ───
    const { data: laboratorio, error: deleteError } = await supabaseAdmin
      .from('laboratorio')
      .update({ estado_logico: false })
      .eq('id_laboratorio', id)
      .select(LABORATORIO_SELECT)
      .single();

    if (deleteError) {
      console.error('❌ Error deleting laboratorio:', deleteError);
      res.status(400).json({
        success: false,
        message: 'No se pudo eliminar el laboratorio. Intenta nuevamente.',
        error: deleteError.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Laboratorio eliminado exitosamente',
      data: laboratorio,
    });
  } catch (error) {
    console.error('❌ Error in deleteLaboratorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};