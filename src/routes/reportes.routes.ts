import { Router } from 'express';
import { getReporteVentas, getReporteInventario } from '../controllers/reportes.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/reportes/ventas
 * @desc    Reporte agregado de ventas (KPIs, series y distribuciones)
 * @query   desde (yyyy-mm-dd) | hasta (yyyy-mm-dd) | opcionales
 * @access  Private (requiere autenticación)
 */
router.get('/ventas', getReporteVentas);

/**
 * @route   GET /api/v1/reportes/inventario
 * @desc    Reporte de inventario (valorización, estados de stock, lotes y movimientos)
 * @query   desde (yyyy-mm-dd) | hasta (yyyy-mm-dd) | opcionales (rango de movimientos)
 * @access  Private (requiere autenticación)
 */
router.get('/inventario', getReporteInventario);

export default router;