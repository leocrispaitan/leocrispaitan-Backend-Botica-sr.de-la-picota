import { Router } from 'express';
import { getReporteVentas } from '../controllers/reportes.controller';
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

export default router;