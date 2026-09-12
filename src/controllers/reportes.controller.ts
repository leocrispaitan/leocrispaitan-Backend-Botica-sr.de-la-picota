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

/* ═════════════════════════════════════════════════════════════════════
 *  REPORTE DE INVENTARIO
 * ═════════════════════════════════════════════════════════════════════ */

interface ProductoDoc {
  id_producto: number;
  nombre_comercial: string;
  nombre_generico: string | null;
  unidad_medida: string | null;
  precio_venta: number;
  costo_referencial: number;
  stock_minimo_alerta: number;
  id_categoria: number | null;
  id_proveedor: number | null;
}

interface CategoriaDoc {
  id_categoria: number;
  nombre_categoria: string;
}

interface LoteDoc {
  id_inventario: number;
  id_producto: number;
  numero_lote: string | null;
  fecha_vencimiento: string | null;
  fecha_ingreso: string | null;
  costo_unitario_compra: number;
  stock_lote: number;
  ubicacion_estante: string | null;
}

interface MovimientoDoc {
  id_movimiento: number;
  tipo_movimiento: string;
  fecha_hora: string;
}

interface DetalleMovimientoDoc {
  id_movimiento: number;
  cantidad: number;
  costo_unitario: number;
}

interface ProductoConStock {
  id_producto: number;
  nombre: string;
  generico: string | null;
  categoria: string;
  id_categoria: number | null;
  precio_venta: number;
  minimo: number;
  stock: number;
  valor_inventario: number;
  valor_potencial: number;
  estado: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO';
  ratio: number;
}

/** Patrón por estado de stock (consistentes con el frontend). */
const ORDEN_ESTADOS_STOCK = ['OK', 'BAJO', 'CRITICO', 'AGOTADO'];

const COLOR_ESTADOS_STOCK: Record<string, string> = {
  OK: '#10b981',
  BAJO: '#f59e0b',
  CRITICO: '#f43f5e',
  AGOTADO: '#64748b',
};

const etiquetaMedia = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
};

const fechaKeyLote = (iso: string | null): string | null => {
  if (!iso) return null;
  const [fechaHora, resto] = iso.includes('T') ? iso.split('T') : [iso, ''];
  const fecha = (resto ? fechaHora : iso).slice(0, 10);
  const match = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  return match ? fecha : null;
};

/** Clasificar el estado de stock de un producto según stock vs mínimo. */
const estadoStock = (stock: number, minimo: number): 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO' => {
  const min = Math.max(1, minimo);
  if (stock <= 0) return 'AGOTADO';
  if (stock <= Math.ceil(min * 0.5)) return 'CRITICO';
  if (stock <= min) return 'BAJO';
  return 'OK';
};

const fetchProductos = async (): Promise<ProductoDoc[]> => {
  const { data, error } = await supabaseAdmin
    .from('producto')
    .select(
      'id_producto, nombre_comercial, nombre_generico, unidad_medida, precio_venta, costo_referencial, stock_minimo_alerta, id_categoria, id_proveedor'
    )
    .eq('estado_logico', true);

  if (error) throw new Error(error.message);

  return (data || []).map((p) => ({
    id_producto: p.id_producto,
    nombre_comercial: p.nombre_comercial,
    nombre_generico: p.nombre_generico,
    unidad_medida: p.unidad_medida,
    precio_venta: Number(p.precio_venta),
    costo_referencial: Number(p.costo_referencial),
    stock_minimo_alerta: Number(p.stock_minimo_alerta),
    id_categoria: p.id_categoria,
    id_proveedor: p.id_proveedor,
  }));
};

const fetchCategorias = async (): Promise<Map<number, string>> => {
  const { data, error } = await supabaseAdmin
    .from('categoria')
    .select('id_categoria, nombre_categoria')
    .eq('estado_logico', true);

  if (error) throw new Error(error.message);

  return new Map((data || []).map((c: CategoriaDoc) => [c.id_categoria, c.nombre_categoria]));
};

const fetchLotes = async (): Promise<LoteDoc[]> => {
  const { data, error } = await supabaseAdmin
    .from('inventario_lote')
    .select(
      'id_inventario, id_producto, numero_lote, fecha_vencimiento, fecha_ingreso, costo_unitario_compra, stock_lote, ubicacion_estante'
    );

  if (error) throw new Error(error.message);

  return (data || []).map((l) => ({
    id_inventario: l.id_inventario,
    id_producto: l.id_producto,
    numero_lote: l.numero_lote,
    fecha_vencimiento: l.fecha_vencimiento,
    fecha_ingreso: l.fecha_ingreso,
    costo_unitario_compra: Number(l.costo_unitario_compra),
    stock_lote: Number(l.stock_lote),
    ubicacion_estante: l.ubicacion_estante,
  }));
};

const fetchMovimientosPeriodo = async (desde: string | null, hasta: string | null): Promise<MovimientoDoc[]> => {
  let query = supabaseAdmin.from('movimiento').select('id_movimiento, tipo_movimiento, fecha_hora');

  if (desde) query = query.gte('fecha_hora', `${desde}T00:00:00`);
  if (hasta) query = query.lte('fecha_hora', `${hasta}T23:59:59`);

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data || []).map((m) => ({
    id_movimiento: m.id_movimiento,
    tipo_movimiento: m.tipo_movimiento,
    fecha_hora: m.fecha_hora,
  }));
};

const fetchDetalleMovimientos = async (ids: number[]): Promise<DetalleMovimientoDoc[]> => {
  if (ids.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('detalle_movimiento')
    .select('id_movimiento, cantidad, costo_unitario')
    .in('id_movimiento', ids);

  if (error) throw new Error(error.message);

  return (data || []).map((d) => ({
    id_movimiento: d.id_movimiento,
    cantidad: Number(d.cantidad),
    costo_unitario: Number(d.costo_unitario),
  }));
};

const TIPOS_ENTRADA = new Set(['COMPRA', 'DEVOLUCION']);

const esEntrada = (tipo: string): boolean => TIPOS_ENTRADA.has(tipo.toUpperCase());

/**
 * GET /api/v1/reportes/inventario
 *
 * Parámetros opcionales:
 *  - desde: yyyy-mm-dd  (filtra el período de movimientos)
 *  - hasta: yyyy-mm-dd  (filtra el período de movimientos)
 *
 * La valorización del stock es un corte al momento actual; el rango solo
 * afecta la sección de movimientos y la evolución del stock.
 */
export const getReporteInventario = async (req: Request, res: Response): Promise<void> => {
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

    // ─── Datos base ───
    const [productosRaw, categoriaMap, lotes] = await Promise.all([
      fetchProductos(),
      fetchCategorias(),
      fetchLotes(),
    ]);

    const hoy = toYMD(new Date());
    const hoyMs = new Date(`${hoy}T00:00:00`).getTime();

    const lotesConStock = lotes.filter((l) => l.stock_lote > 0);

    const stockPorProducto = new Map<number, number>();
    lotesConStock.forEach((l) => {
      stockPorProducto.set(l.id_producto, (stockPorProducto.get(l.id_producto) || 0) + l.stock_lote);
    });

    const nombreCategoria = (id: number | null): string => {
      const nombre = id == null ? null : categoriaMap.get(id);
      return (nombre || 'SIN CATEGORÍA').toUpperCase();
    };

    // ─── Productos con stock y valorización ───
    const productos: ProductoConStock[] = productosRaw.map((p) => {
      const stock = stockPorProducto.get(p.id_producto) || 0;
      let valorInventario = 0;
      let valorPotencial = 0;
      lotesConStock
        .filter((l) => l.id_producto === p.id_producto)
        .forEach((l) => {
          valorInventario += l.stock_lote * l.costo_unitario_compra;
          valorPotencial += l.stock_lote * p.precio_venta;
        });

      return {
        id_producto: p.id_producto,
        nombre: p.nombre_comercial,
        generico: p.nombre_generico,
        categoria: nombreCategoria(p.id_categoria),
        id_categoria: p.id_categoria,
        precio_venta: p.precio_venta,
        minimo: p.stock_minimo_alerta,
        stock,
        valor_inventario: formatoNumero(valorInventario),
        valor_potencial: formatoNumero(valorPotencial),
        estado: estadoStock(stock, p.stock_minimo_alerta),
        ratio: stock > 0 ? stock / Math.max(1, p.stock_minimo_alerta) : 0,
      };
    });

    // ─── KPIs ───
    const unidadesTotales = lotesConStock.reduce((sum, l) => sum + l.stock_lote, 0);
    const valorInventario = lotesConStock.reduce((sum, l) => sum + l.stock_lote * l.costo_unitario_compra, 0);
    const valorPotencial = productos.reduce((sum, p) => sum + p.valor_potencial, 0);

    const estados = new Map<string, number>();
    productos.forEach((p) => {
      estados.set(p.estado, (estados.get(p.estado) || 0) + 1);
    });

    // ─── Lotes próximos a vencer ───
    const diasRestantes = (fechaVenc: string | null): number | null => {
      const fecha = fechaKeyLote(fechaVenc);
      if (!fecha) return null;
      const ms = new Date(`${fecha}T00:00:00`).getTime() - hoyMs;
      return Math.ceil(ms / 86400000);
    };

    const expirados = lotesConStock.filter((l) => {
      const dias = diasRestantes(l.fecha_vencimiento);
      return dias !== null && dias < 0;
    });
    const vencer30 = lotesConStock.filter((l) => {
      const dias = diasRestantes(l.fecha_vencimiento);
      return dias !== null && dias >= 0 && dias <= 30;
    });
    const vencer60 = lotesConStock.filter((l) => {
      const dias = diasRestantes(l.fecha_vencimiento);
      return dias !== null && dias >= 0 && dias <= 60;
    });
    const vencer90 = lotesConStock.filter((l) => {
      const dias = diasRestantes(l.fecha_vencimiento);
      return dias !== null && dias >= 0 && dias <= 90;
    });

    const nombreProducto = new Map(productosRaw.map((p) => [p.id_producto, p.nombre_comercial]));

    const lotes_por_vencer = vencer90
      .map((l) => ({
        id_inventario: l.id_inventario,
        numero_lote: l.numero_lote || '—',
        producto: nombreProducto.get(l.id_producto) || `Producto #${l.id_producto}`,
        fecha_vencimiento: fechaKeyLote(l.fecha_vencimiento) || '—',
        dias: diasRestantes(l.fecha_vencimiento) || 0,
        stock: l.stock_lote,
        ubicacion: l.ubicacion_estante || '—',
        urgencia: diasRestantes(l.fecha_vencimiento) !== null && (diasRestantes(l.fecha_vencimiento) as number) <= 30 ? 'URGENTE' : 'PROXIMO',
      }))
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 20);

    const lotes_vencidos = expirados
      .map((l) => ({
        id_inventario: l.id_inventario,
        numero_lote: l.numero_lote || '—',
        producto: nombreProducto.get(l.id_producto) || `Producto #${l.id_producto}`,
        fecha_vencimiento: fechaKeyLote(l.fecha_vencimiento) || '—',
        dias: diasRestantes(l.fecha_vencimiento) || 0,
        stock: l.stock_lote,
        ubicacion: l.ubicacion_estante || '—',
      }))
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 20);

    // ─── Por estado ───
    const por_estado = ORDEN_ESTADOS_STOCK.map((estado) => {
      const productosEnEstado = productos.filter((p) => p.estado === estado);
      return {
        estado,
        productos: productosEnEstado.length,
        unidades: Math.round(productosEnEstado.reduce((sum, p) => sum + p.stock, 0)),
        valor: formatoNumero(productosEnEstado.reduce((sum, p) => sum + p.valor_inventario, 0)),
        porcentaje: productos.length > 0 ? redondear1((productosEnEstado.length / productos.length) * 100) : 0,
      };
    });

    // ─── Por categoría ───
    const categoriaMapResult = new Map<string, { productos: number; unidades: number; valor: number }>();
    productos.forEach((p) => {
      const actual = categoriaMapResult.get(p.categoria) || { productos: 0, unidades: 0, valor: 0 };
      categoriaMapResult.set(p.categoria, {
        productos: actual.productos + 1,
        unidades: actual.unidades + p.stock,
        valor: actual.valor + p.valor_inventario,
      });
    });

    const por_categoria = Array.from(categoriaMapResult.entries())
      .map(([categoria, datos]) => ({
        categoria,
        productos: datos.productos,
        unidades: Math.round(datos.unidades),
        valor: formatoNumero(datos.valor),
        porcentaje: unidadesTotales > 0 ? redondear1((datos.unidades / unidadesTotales) * 100) : 0,
      }))
      .sort((a, b) => b.valor - a.valor);

    // ─── Top por valor en inventario ───
    const top_valor = [...productos]
      .sort((a, b) => b.valor_inventario - a.valor_inventario)
      .slice(0, 8)
      .map((p) => ({
        nombre: p.nombre,
        categoria: p.categoria,
        unidades: p.stock,
        valor: p.valor_inventario,
        potencial: p.valor_potencial,
        margen: formatoNumero(p.valor_potencial - p.valor_inventario),
      }));

    // ─── Productos críticos ───
    const productos_criticos = productos
      .filter((p) => p.estado !== 'OK')
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 12)
      .map((p) => ({
        id_producto: p.id_producto,
        nombre: p.nombre,
        categoria: p.categoria,
        stock: p.stock,
        minimo: p.minimo,
        ratio: redondear1(p.ratio),
        estado: p.estado,
        valor: p.valor_inventario,
      }));

    // ─── Movimientos ───
    const movimientos = await fetchMovimientosPeriodo(desde, hasta);
    const detalleMovs = await fetchDetalleMovimientos(movimientos.map((m) => m.id_movimiento));

    const movimientoFecha = (m: MovimientoDoc): string => {
      const d = new Date(m.fecha_hora.replace(' ', 'T'));
      return toYMD(d);
    };

    const unidadesPorMovimiento = new Map<number, number>();
    detalleMovs.forEach((d) => {
      unidadesPorMovimiento.set(d.id_movimiento, (unidadesPorMovimiento.get(d.id_movimiento) || 0) + d.cantidad);
    });

    const movimientosPorDia = new Map<string, { entradas: number; salidas: number }>();
    let entradasTotales = 0;
    let salidasTotales = 0;

    movimientos.forEach((m) => {
      const esEntrante = esEntrada(m.tipo_movimiento);
      const unidades = unidadesPorMovimiento.get(m.id_movimiento) || 0;
      const key = movimientoFecha(m);
      const actual = movimientosPorDia.get(key) || { entradas: 0, salidas: 0 };

      if (esEntrante) {
        actual.entradas += unidades;
        entradasTotales += unidades;
      } else {
        actual.salidas += unidades;
        salidasTotales += unidades;
      }

      movimientosPorDia.set(key, actual);
    });

    let inicio: string;
    let fin: string;

    if (desde && hasta) {
      inicio = desde;
      fin = hasta;
    } else {
      const fechas = Array.from(movimientosPorDia.keys()).sort();
      if (fechas.length === 0) {
        inicio = hoy;
        fin = hoy;
      } else {
        inicio = fechas[0];
        fin = fechas[fechas.length - 1];
      }
    }

    const serie_movimientos: Array<{
      fecha: string;
      etiqueta: string;
      entradas: number;
      salidas: number;
      neto: number;
    }> = [];

    const serie_stock: Array<{
      fecha: string;
      etiqueta: string;
      nivel: number;
      entradas: number;
      salidas: number;
    }> = [];

    let cursor = inicio;
    let iteraciones = 0;
    const maxDias = 370;
    const netoPorDia: Array<{ fecha: string; neto: number }> = [];

    while (cursor <= fin && iteraciones <= maxDias) {
      const datosDia = movimientosPorDia.get(cursor) || { entradas: 0, salidas: 0 };
      const neto = datosDia.entradas - datosDia.salidas;
      netoPorDia.push({ fecha: cursor, neto });

      serie_movimientos.push({
        fecha: cursor,
        etiqueta: etiquetaMedia(cursor),
        entradas: datosDia.entradas,
        salidas: datosDia.salidas,
        neto,
      });

      if (cursor === fin) break;
      cursor = addDays(cursor, 1);
      iteraciones += 1;
    }

    // Construir serie_stock: nivel estimado de stock por día.
    // Dado que el último día corresponde al stock actual, retroactivamente
    // descontamos los movimientos posteriores a cada día.
    let nivelBase = unidadesTotales;
    const niveles: number[] = [];
    for (let i = netoPorDia.length - 1; i >= 0; i--) {
      niveles[i] = Math.max(0, Math.round(nivelBase));
      nivelBase -= netoPorDia[i].neto;
    }

    netoPorDia.forEach((item, idx) => {
      serie_stock.push({
        fecha: item.fecha,
        etiqueta: etiquetaMedia(item.fecha),
        nivel: niveles[idx],
        entradas: movimientosPorDia.get(item.fecha)?.entradas || 0,
        salidas: movimientosPorDia.get(item.fecha)?.salidas || 0,
      });
    });

    // ─── Por tipo de movimiento ───
    const tipoMap = new Map<string, { movimientos: number; unidades: number }>();
    movimientos.forEach((m) => {
      const tipo = m.tipo_movimiento.toUpperCase();
      const actual = tipoMap.get(tipo) || { movimientos: 0, unidades: 0 };
      tipoMap.set(tipo, {
        movimientos: actual.movimientos + 1,
        unidades: actual.unidades + (unidadesPorMovimiento.get(m.id_movimiento) || 0),
      });
    });

    const por_tipo_movimiento = Array.from(tipoMap.entries())
      .map(([tipo, datos]) => ({
        tipo,
        movimientos: datos.movimientos,
        unidades: Math.round(datos.unidades),
      }))
      .sort((a, b) => b.movimientos - a.movimientos);

    // ─── KPIs finales ───
    const kpis = {
      total_productos: productos.length,
      total_categorias: categoriaMap.size,
      total_proveedores: new Set(productosRaw.map((p) => p.id_proveedor).filter((id): id is number => id != null)).size,
      unidades_totales: Math.round(unidadesTotales),
      lotes_total: lotesConStock.length,
      valor_inventario: formatoNumero(valorInventario),
      valor_potencial: formatoNumero(valorPotencial),
      margen_potencial: formatoNumero(valorPotencial - valorInventario),
      stock_ok: estados.get('OK') || 0,
      stock_bajo: estados.get('BAJO') || 0,
      stock_critico: estados.get('CRITICO') || 0,
      stock_agotado: estados.get('AGOTADO') || 0,
      alertas_stock: (estados.get('BAJO') || 0) + (estados.get('CRITICO') || 0) + (estados.get('AGOTADO') || 0),
      lotes_vencen_30: vencer30.length,
      lotes_vencen_60: vencer60.length,
      lotes_vencen_90: vencer90.length,
      lotes_vencidos: expirados.length,
      entradas_totales: Math.round(entradasTotales),
      salidas_totales: Math.round(salidasTotales),
      valor_promedio_producto: productos.length > 0 ? formatoNumero(valorPotencial / productos.length) : 0,
    };

    res.status(200).json({
      success: true,
      message: 'Reporte de inventario obtenido exitosamente',
      data: {
        rango: {
          desde,
          hasta,
          periodo_completo: !desde && !hasta,
        },
        fecha_corte: hoy,
        kpis,
        por_estado,
        por_categoria,
        top_valor,
        productos_criticos,
        lotes_por_vencer,
        lotes_vencidos,
        serie_movimientos,
        serie_stock,
        por_tipo_movimiento,
        paleta_estados: COLOR_ESTADOS_STOCK,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching reporte de inventario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar el reporte de inventario',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};