import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest, RolEnum } from '../types';
import { emitChange } from '../sockets';

const COMPROBANTES_VALIDOS = ['BOLETA', 'FACTURA', 'TICKET'] as const;

// ═══════════════════════════════════════════════════════════════════
// POST /api/v1/ventas — Registrar una venta del POS (vendedor o admin)
// Body: { id_cliente?, id_metodo_pago, tipo_comprobante, monto_pagado,
//   items: [{id_producto, cantidad, codigo_presentacion?}] }
// `cantidad` son unidades de la presentación (ej. 5 TAB); el servidor convierte
// a unidades base con factor_a_base y descuenta stock fraccionado (FEFO).
// ═══════════════════════════════════════════════════════════════════
export const createVenta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id_usuario = req.user?.usuario?.id_usuario;
    if (!id_usuario) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      return;
    }

    const { id_cliente, id_metodo_pago, tipo_comprobante, monto_pagado, items } = req.body || {};
    const errores: string[] = [];

    const tipoComp = String(tipo_comprobante || '').toUpperCase();
    if (!COMPROBANTES_VALIDOS.includes(tipoComp as (typeof COMPROBANTES_VALIDOS)[number])) {
      errores.push('El tipo de comprobante debe ser BOLETA, FACTURA o TICKET.');
    }
    if (!Number.isInteger(Number(id_metodo_pago)) || Number(id_metodo_pago) <= 0) {
      errores.push('El método de pago es obligatorio.');
    }
    if (!Array.isArray(items) || items.length === 0) {
      errores.push('Debe agregar al menos un producto a la venta.');
    }
    // FACTURA exige cliente con RUC (regla SUNAT simplificada)
    if (tipoComp === 'FACTURA' && (!Number.isInteger(Number(id_cliente)) || Number(id_cliente) <= 0)) {
      errores.push('La FACTURA requiere un cliente registrado.');
    }
    if (errores.length > 0) {
      res.status(400).json({ success: false, message: 'Error de validación', error: errores });
      return;
    }

    const itemsNorm = (items as Array<Record<string, unknown>>).map((it, i) => ({
      idx: i,
      id_producto: Number(it.id_producto),
      cantidad_pres: Number(it.cantidad ?? it.cantidad_presentacion),
      codigo: it.codigo_presentacion ? String(it.codigo_presentacion).toUpperCase() : null,
    }));

    for (const it of itemsNorm) {
      if (!Number.isInteger(it.id_producto) || it.id_producto <= 0) errores.push(`Item ${it.idx + 1}: producto inválido.`);
      if (!Number.isInteger(it.cantidad_pres) || it.cantidad_pres <= 0) errores.push(`Item ${it.idx + 1}: cantidad debe ser entero > 0.`);
    }
    if (errores.length > 0) {
      res.status(400).json({ success: false, message: 'Error de validación en los items', error: errores });
      return;
    }

    // ─── Verificar método de pago ───
    const { data: metodo } = await supabaseAdmin
      .from('metodo_pago')
      .select('id_metodo_pago')
      .eq('id_metodo_pago', Number(id_metodo_pago))
      .eq('estado_logico', true)
      .maybeSingle();
    if (!metodo) {
      res.status(404).json({ success: false, message: 'El método de pago no existe o está inactivo.' });
      return;
    }

    // ─── Verificar cliente (opcional salvo FACTURA) ───
    let idClienteFinal: number | null = null;
    let nombreClienteFinal: string | null = null;
    if (id_cliente !== undefined && id_cliente !== null && String(id_cliente).trim() !== '') {
      const { data: cli } = await supabaseAdmin
        .from('cliente')
        .select('id_cliente, nombre_razon_social')
        .eq('id_cliente', Number(id_cliente))
        .eq('estado_logico', true)
        .maybeSingle();
      if (!cli) {
        res.status(404).json({ success: false, message: 'El cliente seleccionado no existe.' });
        return;
      }
      idClienteFinal = Number(id_cliente);
      nombreClienteFinal = cli.nombre_razon_social;
    }

    // ─── Verificar productos + resolver presentación (precio y factor del servidor) ───
    const ids = [...new Set(itemsNorm.map((it) => it.id_producto))];
    const { data: productos, error: prodError } = await supabaseAdmin
      .from('producto')
      .select('id_producto, estado_logico, condicion_venta ( requiere_receta )')
      .in('id_producto', ids);
    if (prodError) {
      res.status(500).json({ success: false, message: 'Error al validar productos', error: prodError.message });
      return;
    }
    const prodMap = new Map((productos || []).map((p) => [p.id_producto, p]));
    const { data: presentaciones, error: presError } = await supabaseAdmin
      .from('producto_presentacion')
      .select('id_producto, codigo_presentacion, nombre_presentacion, factor_a_base, precio_venta, es_base, permite_venta, estado_logico')
      .in('id_producto', ids);
    if (presError) {
      res.status(500).json({ success: false, message: 'Error al validar presentaciones', error: presError.message });
      return;
    }
    const presByProd = new Map<number, Array<{
      codigo_presentacion: string; nombre_presentacion: string; factor_a_base: number | string;
      precio_venta: number | string; es_base: boolean; permite_venta: boolean; estado_logico: boolean;
    }>>();
    (presentaciones || []).forEach((p) => {
      const arr = presByProd.get(p.id_producto) || [];
      arr.push(p);
      presByProd.set(p.id_producto, arr);
    });

    const r6 = (n: number): number => Math.round(n * 1e6) / 1e6;
    const itemsResueltos: Array<{
      idx: number; id_producto: number; codigo: string; nombre_pres: string;
      cantidad_pres: number; factor: number; precio_pres: number;
      cantidad_base: number; precio_base_equiv: number;
    }> = [];
    for (const it of itemsNorm) {
      const p = prodMap.get(it.id_producto);
      if (!p || p.estado_logico === false) {
        errores.push(`Item ${it.idx + 1}: producto ${it.id_producto} no existe o está inactivo.`);
        continue;
      }
      const lista = (presByProd.get(it.id_producto) || []).filter(
        (x) => x.estado_logico !== false && x.permite_venta !== false
      );
      const pres = it.codigo
        ? lista.find((x) => x.codigo_presentacion === it.codigo)
        : lista.find((x) => x.es_base) || lista[0];
      if (!pres) {
        errores.push(`Item ${it.idx + 1}: presentación ${it.codigo || 'base'} no disponible para el producto ${it.id_producto}.`);
        continue;
      }
      const factor = Number(pres.factor_a_base);
      const precioPres = Number(pres.precio_venta);
      if (!(factor > 0) || !(precioPres > 0)) {
        errores.push(`Item ${it.idx + 1}: presentación inválida en catálogo.`);
        continue;
      }
      itemsResueltos.push({
        idx: it.idx,
        id_producto: it.id_producto,
        codigo: pres.codigo_presentacion,
        nombre_pres: pres.nombre_presentacion,
        cantidad_pres: it.cantidad_pres,
        factor,
        precio_pres: precioPres,
        cantidad_base: r6(it.cantidad_pres * factor),
        precio_base_equiv: r6(precioPres / factor),
      });
    }
    if (errores.length > 0) {
      res.status(400).json({ success: false, message: 'Error de validación en los items', error: errores });
      return;
    }

    const { data: lotesStock, error: stockError } = await supabaseAdmin
      .from('inventario_lote')
      .select('id_producto, stock_lote')
      .in('id_producto', ids)
      .eq('estado_logico', true);
    if (stockError) {
      res.status(500).json({ success: false, message: 'Error al validar stock', error: stockError.message });
      return;
    }
    const stockMap = new Map<number, number>();
    (lotesStock || []).forEach((l: { id_producto: number; stock_lote: number | string }) => {
      stockMap.set(l.id_producto, (stockMap.get(l.id_producto) || 0) + (Number(l.stock_lote) || 0));
    });
    const needMap = new Map<number, number>();
    itemsResueltos.forEach((it) => needMap.set(it.id_producto, r6((needMap.get(it.id_producto) || 0) + it.cantidad_base)));
    needMap.forEach((need, idProd) => {
      if ((stockMap.get(idProd) || 0) < need - 1e-9) {
        errores.push(`Stock insuficiente para el producto ${idProd} (disponible: ${stockMap.get(idProd) || 0}, pedido: ${need}).`);
      }
    });
    if (errores.length > 0) {
      res.status(400).json({ success: false, message: 'Stock insuficiente o productos inválidos', error: errores });
      return;
    }

    // ─── DNI rápido (lookup AQPFACT en frontend) + regla de receta médica ───
    // Cliente opcional, EXCEPTO: FACTURA o carrito con productos que exigen receta.
    const recetaDe = (p: { condicion_venta?: { requiere_receta?: boolean } | { requiere_receta?: boolean }[] }): boolean => {
      const cv = Array.isArray(p.condicion_venta) ? p.condicion_venta[0] : p.condicion_venta;
      return cv?.requiere_receta === true;
    };
    const exigeReceta = (productos || []).some(
      (p: { id_producto: number; condicion_venta?: { requiere_receta?: boolean } | { requiere_receta?: boolean }[] }) =>
        recetaDe(p) && itemsResueltos.some((it) => it.id_producto === p.id_producto)
    );
    const dniCli = String(req.body?.dni_cliente || '').trim();
    if (!idClienteFinal && dniCli) {
      if (!/^\d{8}$/.test(dniCli)) {
        res.status(400).json({ success: false, message: 'El DNI debe tener 8 dígitos.' });
        return;
      }
      const { data: cliDni } = await supabaseAdmin
        .from('cliente')
        .select('id_cliente, nombre_razon_social')
        .eq('numero_documento', dniCli)
        .eq('estado_logico', true)
        .maybeSingle();
      if (cliDni) {
        idClienteFinal = cliDni.id_cliente;
        nombreClienteFinal = cliDni.nombre_razon_social;
      } else {
        const nombreCli = String(req.body?.nombre_cliente || '').trim().toUpperCase();
        if (!nombreCli) {
          res.status(400).json({ success: false, message: 'DNI nuevo: falta el nombre del cliente (valídalo primero).' });
          return;
        }
        const { data: nuevoCli, error: cliError } = await supabaseAdmin
          .from('cliente')
          .insert({ tipo_documento: 'DNI', numero_documento: dniCli, nombre_razon_social: nombreCli })
          .select('id_cliente, nombre_razon_social')
          .single();
        if (cliError || !nuevoCli) {
          res.status(500).json({ success: false, message: 'No se pudo registrar el cliente', error: cliError?.message });
          return;
        }
        idClienteFinal = nuevoCli.id_cliente;
        nombreClienteFinal = nuevoCli.nombre_razon_social;
      }
    }
    if (exigeReceta && !idClienteFinal) {
      res.status(400).json({ success: false, message: 'Hay productos con receta médica: ingresa el DNI del cliente.' });
      return;
    }
    void nombreClienteFinal;

    // ─── Totales en soles según presentación (misma regla POS: 5% dscto si subtotal >= 100) ───
    const subtotal = r6(itemsResueltos.reduce((s, it) => s + it.cantidad_pres * it.precio_pres, 0));
    const descuento = subtotal >= 100 ? subtotal * 0.05 : 0;
    const total = Math.round((subtotal - descuento) * 100) / 100;
    const pagado = monto_pagado === undefined || monto_pagado === null || String(monto_pagado).trim() === ''
      ? total
      : Number(monto_pagado);
    if (!(pagado >= 0) || pagado < total) {
      res.status(400).json({
        success: false,
        message: `El monto pagado (S/ ${pagado}) es menor al total (S/ ${total}).`,
      });
      return;
    }

    // ─── 1. Insertar cabecera venta ───
    const { data: venta, error: ventaError } = await supabaseAdmin
      .from('venta')
      .insert({
        id_cliente: idClienteFinal,
        id_usuario,
        id_metodo_pago: Number(id_metodo_pago),
        tipo_comprobante: tipoComp,
        total_pagar: total,
        monto_pagado: pagado,
        estado_venta: 'PAGADA',
      })
      .select('id_venta, fecha_venta, total_pagar, monto_pagado, vuelto, estado_venta, tipo_comprobante')
      .single();

    if (ventaError || !venta) {
      console.error('❌ Error creating venta:', ventaError);
      res.status(500).json({ success: false, message: 'No se pudo registrar la venta', error: ventaError?.message });
      return;
    }

    // ─── 2. Detalle (en unidades base, precio equivalente base) + descuento FEFO por lote ───
    for (const it of itemsResueltos) {
      const { data: det, error: detError } = await supabaseAdmin
        .from('detalle_venta')
        .insert({
          id_venta: venta.id_venta,
          id_producto: it.id_producto,
          cantidad: it.cantidad_base,
          precio_unitario_venta: it.precio_base_equiv,
          codigo_presentacion: it.codigo,
          cantidad_presentacion: it.cantidad_pres,
          factor_a_base: it.factor,
        })
        .select('id_detalle_venta')
        .single();

      if (detError || !det) {
        console.error('❌ Error inserting detalle_venta:', detError);
        res.status(500).json({ success: false, message: `Error al registrar el producto ${it.id_producto}`, error: detError?.message });
        return;
      }

      // Lotes FEFO: vencimiento más próximo primero
      const { data: lotes } = await supabaseAdmin
        .from('inventario_lote')
        .select('id_inventario, stock_lote, fecha_vencimiento, fecha_ingreso')
        .eq('id_producto', it.id_producto)
        .eq('estado_logico', true)
        .gt('stock_lote', 0)
        .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
        .order('fecha_ingreso', { ascending: true });

      let restante = it.cantidad_base;
      for (const lote of lotes || []) {
        if (restante <= 1e-9) break;
        const stockLote = Number(lote.stock_lote) || 0;
        const tomar = r6(Math.min(stockLote, restante));
        if (tomar <= 0) continue;
        const { error: updError } = await supabaseAdmin
          .from('inventario_lote')
          .update({ stock_lote: r6(stockLote - tomar) })
          .eq('id_inventario', lote.id_inventario);
        if (updError) {
          console.error('❌ Error descontando lote:', updError);
          res.status(500).json({ success: false, message: 'Error al descontar stock', error: updError.message });
          return;
        }
        const { error: dvlError } = await supabaseAdmin
          .from('detalle_venta_lote')
          .insert({ id_detalle_venta: det.id_detalle_venta, id_inventario: lote.id_inventario, cantidad: tomar });
        if (dvlError) {
          console.error('❌ Error inserting detalle_venta_lote:', dvlError);
          res.status(500).json({ success: false, message: 'Error al trazar lote de venta', error: dvlError.message });
          return;
        }
        restante -= tomar;
      }
    }

    // ─── 3. Devolver venta completa ───
    const { data: completa } = await supabaseAdmin
      .from('venta')
      .select(`
        id_venta, fecha_venta, tipo_comprobante, total_pagar, monto_pagado, vuelto, estado_venta,
        cliente ( id_cliente, nombre_razon_social, numero_documento ),
        metodo_pago ( id_metodo_pago, nombre_metodo ),
        usuario ( id_usuario, nombre_completo ),
        detalle_venta (
          id_detalle_venta, cantidad, precio_unitario_venta, subtotal,
          codigo_presentacion, cantidad_presentacion, factor_a_base,
          producto ( id_producto, nombre_comercial, nombre_generico )
        )
      `)
      .eq('id_venta', venta.id_venta)
      .single();

    emitChange('ventas', 'created', completa || venta);
    res.status(201).json({ success: true, message: 'Venta registrada exitosamente', data: completa || venta });
  } catch (error) {
    console.error('❌ Error in createVenta:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ═══════════════════════════════════════════════════════════════════
// GET /api/v1/ventas — Historial (vendedor ve las suyas, admin todas)
// Query: ?page=1&limit=20&today=1
// ═══════════════════════════════════════════════════════════════════
export const getVentas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const onlyToday = String(req.query.today || '1') === '1';

    const esAdmin = req.user?.usuario?.id_rol === RolEnum.ADMINISTRATIVO;
    let q = supabaseAdmin
      .from('venta')
      .select(`
        id_venta, fecha_venta, tipo_comprobante, total_pagar, monto_pagado, vuelto, estado_venta,
        cliente ( id_cliente, nombre_razon_social ),
        metodo_pago ( nombre_metodo ),
        usuario ( id_usuario, nombre_completo ),
        detalle_venta ( id_detalle_venta, cantidad )
      `, { count: 'exact' })
      .order('fecha_venta', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!esAdmin) {
      q = q.eq('id_usuario', req.user!.usuario.id_usuario);
    }
    if (onlyToday) {
      // Día operativo en America/Lima (UTC-5 fijo, sin DST). La BD guarda
      // fecha_venta en UTC, así que el "hoy" de Lima equivale a [05:00Z, 05:00Z+1).
      const limaYmd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const [y, m, d] = limaYmd.split('-').map(Number);
      const next = new Date(Date.UTC(y, m - 1, d + 1));
      const nextYmd = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
      q = q.gte('fecha_venta', `${limaYmd}T05:00:00`).lt('fecha_venta', `${nextYmd}T05:00:00`);
    }

    const { data, error, count } = await q;
    if (error) {
      res.status(500).json({ success: false, message: 'Error al obtener ventas', error: error.message });
      return;
    }
    const rows = (data || []).map((v: Record<string, unknown>) => {
      const det = (v.detalle_venta as Array<{ cantidad: number }> | null) || [];
      return {
        ...v,
        items: det.reduce((s: number, x) => s + (Number(x.cantidad) || 0), 0),
        detalle_venta: undefined,
      };
    });
    res.status(200).json({
      success: true,
      message: 'Ventas obtenidas exitosamente',
      data: rows,
      pagination: { page, limit, total: count || rows.length },
    });
  } catch (error) {
    console.error('❌ Error in getVentas:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// ═══════════════════════════════════════════════════════════════════
// GET /api/v1/ventas/:id — Detalle de una venta
// ═══════════════════════════════════════════════════════════════════
export const getVentaById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: 'ID de venta inválido' });
      return;
    }
    let builder = supabaseAdmin
      .from('venta')
      .select(`
        id_venta, fecha_venta, tipo_comprobante, total_pagar, monto_pagado, vuelto, estado_venta,
        cliente ( id_cliente, nombre_razon_social, numero_documento, tipo_documento ),
        metodo_pago ( id_metodo_pago, nombre_metodo ),
        usuario ( id_usuario, nombre_completo ),
        detalle_venta (
          id_detalle_venta, cantidad, precio_unitario_venta, subtotal,
          producto ( id_producto, nombre_comercial, nombre_generico )
        )
      `)
      .eq('id_venta', id);

    // Vendedor solo puede ver sus propias ventas
    if (req.user?.usuario?.id_rol === RolEnum.VENDEDOR) {
      builder = builder.eq('id_usuario', req.user.usuario.id_usuario);
    }
    const { data, error } = await builder.single();
    if (error || !data) {
      res.status(404).json({ success: false, message: 'Venta no encontrada', error: error?.message });
      return;
    }
    res.status(200).json({ success: true, message: 'Venta obtenida exitosamente', data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const noop = (_req: Request, _res: Response): void => undefined;
