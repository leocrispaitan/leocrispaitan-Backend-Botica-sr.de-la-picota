import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/* ─── Helpers de fechas ──────────────────────────────────────────────── */

const toYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (dateStr: string, delta: number): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toYMD(d);
};

const parseDate = (str: string): Date => new Date(`${str}T00:00:00`);

const daysBetweenInclusive = (desde: string, hasta: string): number =>
  Math.round((parseDate(hasta).getTime() - parseDate(desde).getTime()) / 86400000) + 1;

const etiquetaCorta = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
};

/**
 * Validar y normalizar el rango de fechas (yyyy-mm-dd).
 * Devuelve { desde, hasta } o null si el rango es inválido.
 */
const parseRango = (desdeRaw: unknown, hastaRaw: unknown): { desde: string | null; hasta: string | null } | null => {
  const desde = typeof desdeRaw === 'string' ? desdeRaw.trim() : '';
  const hasta = typeof hastaRaw === 'string' ? hastaRaw.trim() : '';
  const re = /^\d{4}-\d{2}-\d{2}$/;

  for (const value of [desde, hasta]) {
    if (value && !re.test(value)) return null;
    if (value && Number.isNaN(parseDate(value).getTime())) return null;
  }

  if (desde && hasta && parseDate(desde).getTime() > parseDate(hasta).getTime()) return null;

  return { desde: desde || null, hasta: hasta || null };
};

interface VentaDoc {
  id_venta: number;
  fecha_venta: string;
  tipo_comprobante: string;
  total_pagar: number;
  monto_pagado: number;
  estado_venta: string;
  id_cliente: number | null;
  cliente: { id_cliente: number; nombre_razon_social: string } | null;
  usuario: { id_usuario: number; nombre_completo: string } | null;
  metodo_pago: { id_metodo_pago: number; nombre_metodo: string } | null;
}

interface DetalleDoc {
  id_venta: number;
  cantidad: number;
  precio_unitario_venta: number;
  producto: { id_producto: number; nombre_comercial: string } | null;
}

/** Punto medio para obtener el anidado (tolerante a objeto o array). */
const pick = (row: unknown): unknown =>
  Array.isArray(row) ? (row[0] ?? null) : row ?? null;

const formatoNumero = (n: number): number => Number(n.toFixed(2));

const redondear1 = (n: number | null): number | null => (n === null ? null : Number(n.toFixed(1)));

/**
 * Obtener el documento de una venta (con cliente, usuario y método de pago anidados).
 */
const fetchVentas = async (desde: string | null, hasta: string | null): Promise<VentaDoc[]> => {
  const base = `id_venta, fecha_venta, tipo_comprobante, total_pagar, monto_pagado, estado_venta, id_cliente,
    cliente (id_cliente, nombre_razon_social),
    usuario (id_usuario, nombre_completo),
    metodo_pago (id_metodo_pago, nombre_metodo)`;

  let query = supabaseAdmin
    .from('venta')
    .select(base)
    .order('fecha_venta', { ascending: false });

  if (desde) query = query.gte('fecha_venta', `${desde}T00:00:00`);
  if (hasta) query = query.lte('fecha_venta', `${hasta}T23:59:59`);

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data || []).map((v) => {
    const cliente = pick(v.cliente) as { id_cliente: number; nombre_razon_social: string } | null;
    const usuario = pick(v.usuario) as { id_usuario: number; nombre_completo: string } | null;
    const metodo = pick(v.metodo_pago) as { id_metodo_pago: number; nombre_metodo: string } | null;
    return {
      id_venta: v.id_venta,
      fecha_venta: v.fecha_venta,
      tipo_comprobante: v.tipo_comprobante,
      total_pagar: Number(v.total_pagar),
      monto_pagado: Number(v.monto_pagado),
      estado_venta: v.estado_venta,
      id_cliente: v.id_cliente,
      cliente,
      usuario,
      metodo_pago: metodo,
    };
  });
};

/**
 * Obtener el detalle (productos) de las ventas indicadas.
 */
const fetchDetalle = async (ids: number[]): Promise<DetalleDoc[]> => {
  if (ids.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('detalle_venta')
    .select('id_venta, cantidad, precio_unitario_venta, producto (id_producto, nombre_comercial)')
    .in('id_venta', ids);

  if (error) throw new Error(error.message);

  return (data || []).map((d) => {
    const producto = pick(d.producto) as { id_producto: number; nombre_comercial: string } | null;
    return {
      id_venta: d.id_venta,
      cantidad: Number(d.cantidad),
      precio_unitario_venta: Number(d.precio_unitario_venta),
      producto,
    };
  });
};

const calcularKpis = (ventas: VentaDoc[], detalle: DetalleDoc[]) => {
  const vigentes = ventas.filter((v) => v.estado_venta !== 'ANULADA');

  const total_ingresos = vigentes.reduce((sum, v) => sum + v.total_pagar, 0);
  const total_ventas = vigentes.length;
  const clientesUnicos = new Set(vigentes.filter((v) => v.id_cliente != null).map((v) => v.id_cliente)).size;

  const unidadesPorVenta = new Map<number, number>();
  detalle.forEach((d) => {
    unidadesPorVenta.set(d.id_venta, (unidadesPorVenta.get(d.id_venta) || 0) + d.cantidad);
  });
  const unidades_vendidas = Array.from(unidadesPorVenta.values()).reduce((a, b) => a + b, 0);

  return {
    total_ingresos,
    total_ventas,
    ticket_promedio: total_ventas > 0 ? formatoNumero(total_ingresos / total_ventas) : 0,
    unidades_vendidas,
    clientes_unicos: clientesUnicos,
  };
};

/**
 * Construir la serie diaria rellenando los días sin ventas.
 */
const construirSerieDiaria = (
  ventas: VentaDoc[],
  detalle: DetalleDoc[],
  desde: string | null,
  hasta: string | null
) => {
  const vigentes = ventas.filter((v) => v.estado_venta !== 'ANULADA');

  const fechaKey = (iso: string): string => {
    const d = new Date(iso.replace(' ', 'T'));
    return toYMD(d);
  };

  const ingresosPorDia = new Map<string, number>();
  const ventasPorDia = new Map<string, number>();
  const unidadesPorDia = new Map<string, number>();

  const unidadesPorVenta = new Map<number, number>();
  detalle.forEach((d) => {
    unidadesPorVenta.set(d.id_venta, (unidadesPorVenta.get(d.id_venta) || 0) + d.cantidad);
  });

  vigentes.forEach((v) => {
    const k = fechaKey(v.fecha_venta);
    ingresosPorDia.set(k, (ingresosPorDia.get(k) || 0) + v.total_pagar);
    ventasPorDia.set(k, (ventasPorDia.get(k) || 0) + 1);
    unidadesPorDia.set(k, (unidadesPorDia.get(k) || 0) + (unidadesPorVenta.get(v.id_venta) || 0));
  });

  let inicio: string;
  let fin: string;

  if (desde && hasta) {
    inicio = desde;
    fin = hasta;
  } else {
    const fechas = Array.from(ingresosPorDia.keys()).sort();
    if (fechas.length === 0) return [];
    inicio = fechas[0];
    fin = fechas[fechas.length - 1];
  }

  const serie: Array<{ fecha: string; etiqueta: string; ingresos: number; ventas: number; unidades: number }> = [];

  let cursor = inicio;
  let iteraciones = 0;
  const maxDias = 370;
  while (cursor <= fin && iteraciones <= maxDias) {
    serie.push({
      fecha: cursor,
      etiqueta: etiquetaCorta(cursor),
      ingresos: formatoNumero(ingresosPorDia.get(cursor) || 0),
      ventas: ventasPorDia.get(cursor) || 0,
      unidades: unidadesPorDia.get(cursor) || 0,
    });
    if (cursor === fin) break;
    cursor = addDays(cursor, 1);
    iteraciones += 1;
  }

  return serie;
};

/**
 * GET /api/v1/reportes/ventas
 *
 * Parámetros opcionales:
 *  - desde: yyyy-mm-dd
 *  - hasta: yyyy-mm-dd
 *
 * Si no se envían, se reporta todo el período de ventas registrado.
 */
export const getReporteVentas = async (req: Request, res: Response): Promise<void> => {
  try {
    const rango = parseRango(req.query.desde, req.query.hasta);

    if (!rango) {
      res.status(400).json({
        success: false,
        message: 'El rango de fechas no es válido. Usa formato yyyy-mm-dd y hasta >= desde.',
        error: ['Rango de fechas inválido.'],
      });
      return;
    }

    const { desde, hasta } = rango;

    // ─── Ventas actuales ───
    const ventas = await fetchVentas(desde, hasta);
    const detalle = await fetchDetalle(ventas.map((v) => v.id_venta));

    const kpis = calcularKpis(ventas, detalle);

    // ─── Período anterior (solo si hay rango definido) ───
    let periodoAnterior: { desde: string; hasta: string } | null = null;

    if (desde && hasta) {
      const dias = daysBetweenInclusive(desde, hasta);
      const prevHasta = addDays(desde, -1);
      const prevDesde = addDays(prevHasta, -(dias - 1));
      periodoAnterior = { desde: prevDesde, hasta: prevHasta };
    }

    let crecimiento = {
      ingresos: null as number | null,
      ventas: null as number | null,
      ticket: null as number | null,
      clientes: null as number | null,
    };

    if (periodoAnterior) {
      const prevVentas = await fetchVentas(periodoAnterior.desde, periodoAnterior.hasta);
      const prevDetalle = await fetchDetalle(prevVentas.map((v) => v.id_venta));
      const prevKpis = calcularKpis(prevVentas, prevDetalle);

      const pct = (actual: number, anterior: number): number | null =>
        anterior > 0 ? ((actual - anterior) / anterior) * 100 : null;

      crecimiento = {
        ingresos: redondear1(pct(kpis.total_ingresos, prevKpis.total_ingresos)),
        ventas: redondear1(pct(kpis.total_ventas, prevKpis.total_ventas)),
        ticket: redondear1(pct(kpis.ticket_promedio, prevKpis.ticket_promedio)),
        clientes: redondear1(pct(kpis.clientes_unicos, prevKpis.clientes_unicos)),
      };
    }

    // ─── Serie diaria ───
    const serie_diaria = construirSerieDiaria(ventas, detalle, desde, hasta);

    // ─── Por hora ───
    const porHoraMap = new Map<string, { ventas: number; ingresos: number }>();
    ventas
      .filter((v) => v.estado_venta !== 'ANULADA')
      .forEach((v) => {
        const d = new Date(v.fecha_venta.replace(' ', 'T'));
        const key = `${d.getHours().toString().padStart(2, '0')}:00`;
        const actual = porHoraMap.get(key) || { ventas: 0, ingresos: 0 };
        porHoraMap.set(key, {
          ventas: actual.ventas + 1,
          ingresos: actual.ingresos + v.total_pagar,
        });
      });

    const por_hora = Array.from(porHoraMap.entries())
      .map(([hora, datos]) => ({
        hora,
        ventas: datos.ventas,
        ingresos: formatoNumero(datos.ingresos),
      }))
      .sort((a, b) => a.hora.localeCompare(b.hora));

    // ─── Por método de pago ───
    const metodoMap = new Map<string, { ingresos: number; ventas: number }>();
    ventas
      .filter((v) => v.estado_venta !== 'ANULADA')
      .forEach((v) => {
        const nombre = v.metodo_pago?.nombre_metodo || 'SIN MÉTODO';
        const actual = metodoMap.get(nombre) || { ingresos: 0, ventas: 0 };
        metodoMap.set(nombre, {
          ingresos: actual.ingresos + v.total_pagar,
          ventas: actual.ventas + 1,
        });
      });

    const por_metodo = Array.from(metodoMap.entries())
      .map(([metodo, datos]) => ({
        metodo,
        ingresos: formatoNumero(datos.ingresos),
        ventas: datos.ventas,
        porcentaje: kpis.total_ingresos > 0 ? redondear1((datos.ingresos / kpis.total_ingresos) * 100) : 0,
      }))
      .sort((a, b) => b.ingresos - a.ingresos);

    // ─── Por comprobante ───
    const comprobanteMap = new Map<string, { ventas: number; ingresos: number }>();
    ventas
      .filter((v) => v.estado_venta !== 'ANULADA')
      .forEach((v) => {
        const actual = comprobanteMap.get(v.tipo_comprobante) || { ventas: 0, ingresos: 0 };
        comprobanteMap.set(v.tipo_comprobante, {
          ventas: actual.ventas + 1,
          ingresos: actual.ingresos + v.total_pagar,
        });
      });

    const por_comprobante = Array.from(comprobanteMap.entries())
      .map(([comprobante, datos]) => ({
        comprobante,
        ventas: datos.ventas,
        ingresos: formatoNumero(datos.ingresos),
        porcentaje: kpis.total_ventas > 0 ? redondear1((datos.ventas / kpis.total_ventas) * 100) : 0,
      }))
      .sort((a, b) => b.ventas - a.ventas);

    // ─── Por estado ───
    const estadoMap = new Map<string, number>();
    ventas.forEach((v) => {
      estadoMap.set(v.estado_venta, (estadoMap.get(v.estado_venta) || 0) + 1);
    });

    const ordenEstados = ['PENDIENTE', 'PAGADA', 'ANULADA'];
    const por_estado = ordenEstados
      .filter((estado) => estadoMap.has(estado))
      .map((estado) => ({ estado, ventas: estadoMap.get(estado) || 0 }));

    // ─── Top productos ───
    const idsVigentes = new Set(ventas.filter((v) => v.estado_venta !== 'ANULADA').map((v) => v.id_venta));
    const productoMap = new Map<string, { cantidad: number; ingresos: number }>();

    detalle.forEach((d) => {
      if (!idsVigentes.has(d.id_venta)) return;
      const nombre = d.producto?.nombre_comercial || `Producto #${d.producto?.id_producto ?? ''}`.trim();
      const actual = productoMap.get(nombre) || { cantidad: 0, ingresos: 0 };
      productoMap.set(nombre, {
        cantidad: actual.cantidad + (d.producto ? d.cantidad : 0),
        ingresos: actual.ingresos + (d.producto ? d.cantidad * d.precio_unitario_venta : 0),
      });
    });

    const top_productos = Array.from(productoMap.entries())
      .map(([nombre, datos]) => ({
        nombre,
        cantidad: datos.cantidad,
        ingresos: formatoNumero(datos.ingresos),
        porcentaje: kpis.total_ingresos > 0 ? redondear1((datos.ingresos / kpis.total_ingresos) * 100) : 0,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 8);

    // ─── Ventas recientes ───
    const ventas_recientes = ventas.slice(0, 8).map((v) => ({
      id_venta: v.id_venta,
      fecha_venta: v.fecha_venta,
      cliente: v.cliente?.nombre_razon_social || 'CONSUMIDOR FINAL',
      vendedor: v.usuario?.nombre_completo || '—',
      metodo: v.metodo_pago?.nombre_metodo || '—',
      comprobante: v.tipo_comprobante,
      total_pagar: Number(v.total_pagar),
      estado_venta: v.estado_venta,
    }));

    res.status(200).json({
      success: true,
      message: 'Reporte de ventas obtenido exitosamente',
      data: {
        rango: {
          desde,
          hasta,
          dias: desde && hasta ? daysBetweenInclusive(desde, hasta) : null,
          periodo_completo: !desde && !hasta,
        },
        kpis,
        crecimiento,
        periodo_anterior: periodoAnterior,
        serie_diaria,
        por_hora,
        por_metodo,
        por_comprobante,
        por_estado,
        top_productos,
        ventas_recientes,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching reporte de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar el reporte de ventas',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};