import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const TIPOS_DOC = ['DNI', 'RUC', 'CE', 'PASAPORTE'] as const;

// ═══════════════════════════════════════════════════════════════════
// GET /api/v1/clientes?search=&limit=20 — Buscador para el POS
// ═══════════════════════════════════════════════════════════════════
export const searchClientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = String(req.query.search || '').trim();
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    let q = supabaseAdmin
      .from('cliente')
      .select('id_cliente, tipo_documento, numero_documento, nombre_razon_social, telefono, email')
      .eq('estado_logico', true)
      .order('nombre_razon_social', { ascending: true })
      .limit(limit);

    if (search) {
      const pattern = `%${search}%`;
      q = q.or(`nombre_razon_social.ilike.${pattern},numero_documento.ilike.${pattern}`);
    }

    const { data, error } = await q;
    if (error) {
      res.status(500).json({ success: false, message: 'Error al buscar clientes', error: error.message });
      return;
    }
    res.status(200).json({ success: true, message: 'Clientes obtenidos exitosamente', data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ═══════════════════════════════════════════════════════════════════
// GET /api/v1/clientes/all — Listado completo con estadísticas (gestión)
// Query: ?search=&estado=all|true|false&page=1&limit=20
// ═══════════════════════════════════════════════════════════════════
export const getAllClientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = String(req.query.search || '').trim();
    const estado = String(req.query.estado || 'all');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let q = supabaseAdmin
      .from('cliente')
      .select('id_cliente, tipo_documento, numero_documento, nombre_razon_social, telefono, email, direccion, estado_logico, fecha_registro', { count: 'exact' })
      .order('nombre_razon_social', { ascending: true });

    if (estado === 'true') q = q.eq('estado_logico', true);
    if (estado === 'false') q = q.eq('estado_logico', false);

    if (search) {
      const pattern = `%${search}%`;
      q = q.or(`nombre_razon_social.ilike.${pattern},numero_documento.ilike.${pattern}`);
    }

    const { data: clientes, error, count } = await q.range(offset, offset + limit - 1);
    if (error) {
      res.status(500).json({ success: false, message: 'Error al obtener clientes', error: error.message });
      return;
    }

    const ids = (clientes || []).map((c: { id_cliente: number }) => c.id_cliente);
    const statsMap = new Map<number, { total_compras: number; monto_total: number }>();
    if (ids.length > 0) {
      const { data: ventas } = await supabaseAdmin
        .from('venta')
        .select('id_cliente, total_pagar')
        .in('id_cliente', ids);
      (ventas || []).forEach((v: { id_cliente: number; total_pagar: number | string }) => {
        const cur = statsMap.get(v.id_cliente) || { total_compras: 0, monto_total: 0 };
        cur.total_compras += 1;
        cur.monto_total += Number(v.total_pagar) || 0;
        statsMap.set(v.id_cliente, cur);
      });
    }

    const data = (clientes || []).map((c: Record<string, unknown>) => ({
      ...c,
      total_compras: statsMap.get(c.id_cliente as number)?.total_compras || 0,
      monto_total: statsMap.get(c.id_cliente as number)?.monto_total || 0,
    }));

    res.status(200).json({
      success: true,
      message: 'Clientes obtenidos exitosamente',
      data,
      total: count ?? data.length,
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ═══════════════════════════════════════════════════════════════════
// GET /api/v1/clientes/:id — Detalle con estadísticas
// ═══════════════════════════════════════════════════════════════════
export const getClienteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'El ID del cliente no es válido.' });
      return;
    }
    const { data: cliente, error } = await supabaseAdmin
      .from('cliente')
      .select('id_cliente, tipo_documento, numero_documento, nombre_razon_social, telefono, email, direccion, estado_logico, fecha_registro')
      .eq('id_cliente', id)
      .maybeSingle();
    if (error) {
      res.status(500).json({ success: false, message: 'Error al obtener el cliente', error: error.message });
      return;
    }
    if (!cliente) {
      res.status(404).json({ success: false, message: 'El cliente no existe.' });
      return;
    }
    const { data: ventas } = await supabaseAdmin
      .from('venta')
      .select('total_pagar')
      .eq('id_cliente', id);
    const total_compras = (ventas || []).length;
    const monto_total = (ventas || []).reduce((s: number, v: { total_pagar: number | string }) => s + (Number(v.total_pagar) || 0), 0);

    res.status(200).json({
      success: true,
      message: 'Cliente obtenido exitosamente',
      data: { ...cliente, total_compras, monto_total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ═══════════════════════════════════════════════════════════════════
// POST /api/v1/clientes — Crear cliente
// ═══════════════════════════════════════════════════════════════════
export const createCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const tipo_documento = String(body.tipo_documento || '').toUpperCase();
    const numero_documento = String(body.numero_documento || '').trim();
    const nombre_razon_social = String(body.nombre_razon_social || '').trim();
    const telefono = body.telefono ? String(body.telefono).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const direccion = body.direccion ? String(body.direccion).trim() : null;

    const errores: string[] = [];
    if (!TIPOS_DOC.includes(tipo_documento as (typeof TIPOS_DOC)[number])) {
      errores.push('El tipo de documento no es válido.');
    }
    if (!numero_documento) errores.push('El número de documento es obligatorio.');
    if (!nombre_razon_social) errores.push('El nombre o razón social es obligatorio.');
    if (errores.length > 0) {
      res.status(400).json({ success: false, message: errores[0], error: errores });
      return;
    }

    const { data: existente } = await supabaseAdmin
      .from('cliente')
      .select('id_cliente')
      .eq('numero_documento', numero_documento)
      .maybeSingle();
    if (existente) {
      res.status(400).json({ success: false, message: 'Ya existe un cliente con ese número de documento.' });
      return;
    }

    const { data: creado, error } = await supabaseAdmin
      .from('cliente')
      .insert({
        tipo_documento,
        numero_documento,
        nombre_razon_social,
        telefono,
        email,
        direccion,
        estado_logico: true,
      })
      .select('id_cliente, tipo_documento, numero_documento, nombre_razon_social, telefono, email, direccion, estado_logico, fecha_registro')
      .single();
    if (error || !creado) {
      res.status(500).json({ success: false, message: 'No se pudo crear el cliente', error: error?.message });
      return;
    }
    res.status(201).json({ success: true, message: 'Cliente creado exitosamente', data: { ...creado, total_compras: 0, monto_total: 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ═══════════════════════════════════════════════════════════════════
// PUT /api/v1/clientes/:id — Actualizar cliente
// ═══════════════════════════════════════════════════════════════════
export const updateCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'El ID del cliente no es válido.' });
      return;
    }
    const body = req.body || {};
    const tipo_documento = String(body.tipo_documento || '').toUpperCase();
    const numero_documento = String(body.numero_documento || '').trim();
    const nombre_razon_social = String(body.nombre_razon_social || '').trim();
    const telefono = body.telefono ? String(body.telefono).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const direccion = body.direccion ? String(body.direccion).trim() : null;
    const estado_logico = typeof body.estado_logico === 'boolean' ? body.estado_logico : undefined;

    const errores: string[] = [];
    if (!TIPOS_DOC.includes(tipo_documento as (typeof TIPOS_DOC)[number])) errores.push('El tipo de documento no es válido.');
    if (!numero_documento) errores.push('El número de documento es obligatorio.');
    if (!nombre_razon_social) errores.push('El nombre o razón social es obligatorio.');
    if (errores.length > 0) {
      res.status(400).json({ success: false, message: errores[0], error: errores });
      return;
    }

    const { data: existente } = await supabaseAdmin
      .from('cliente')
      .select('id_cliente')
      .eq('numero_documento', numero_documento)
      .neq('id_cliente', id)
      .maybeSingle();
    if (existente) {
      res.status(400).json({ success: false, message: 'Ya existe otro cliente con ese número de documento.' });
      return;
    }

    const datos: Record<string, unknown> = {
      tipo_documento,
      numero_documento,
      nombre_razon_social,
      telefono,
      email,
      direccion,
    };
    if (typeof estado_logico === 'boolean') datos.estado_logico = estado_logico;

    const { data: actualizado, error } = await supabaseAdmin
      .from('cliente')
      .update(datos)
      .eq('id_cliente', id)
      .select('id_cliente, tipo_documento, numero_documento, nombre_razon_social, telefono, email, direccion, estado_logico, fecha_registro')
      .single();
    if (error || !actualizado) {
      res.status(500).json({ success: false, message: 'No se pudo actualizar el cliente', error: error?.message });
      return;
    }

    const { data: ventas } = await supabaseAdmin
      .from('venta')
      .select('total_pagar')
      .eq('id_cliente', id);
    const total_compras = (ventas || []).length;
    const monto_total = (ventas || []).reduce((s: number, v: { total_pagar: number | string }) => s + (Number(v.total_pagar) || 0), 0);

    res.status(200).json({ success: true, message: 'Cliente actualizado exitosamente', data: { ...actualizado, total_compras, monto_total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ═══════════════════════════════════════════════════════════════════
// DELETE /api/v1/clientes/:id — Soft delete
// ═══════════════════════════════════════════════════════════════════
export const deleteCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'El ID del cliente no es válido.' });
      return;
    }
    const { data: existente } = await supabaseAdmin
      .from('cliente')
      .select('id_cliente, estado_logico')
      .eq('id_cliente', id)
      .maybeSingle();
    if (!existente) {
      res.status(404).json({ success: false, message: 'El cliente no existe.' });
      return;
    }
    if (!existente.estado_logico) {
      res.status(400).json({ success: false, message: 'El cliente ya está desactivado.' });
      return;
    }
    const { data: desactivado, error } = await supabaseAdmin
      .from('cliente')
      .update({ estado_logico: false })
      .eq('id_cliente', id)
      .select('id_cliente, tipo_documento, numero_documento, nombre_razon_social, telefono, email, direccion, estado_logico, fecha_registro')
      .single();
    if (error || !desactivado) {
      res.status(500).json({ success: false, message: 'No se pudo desactivar el cliente', error: error?.message });
      return;
    }
    res.status(200).json({ success: true, message: 'Cliente desactivado exitosamente', data: desactivado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
