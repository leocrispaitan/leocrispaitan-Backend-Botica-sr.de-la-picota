import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

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
