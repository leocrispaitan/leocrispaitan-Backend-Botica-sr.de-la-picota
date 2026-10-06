import { Router } from 'express';
import { createVenta, getVentas, getVentaById } from '../controllers/ventas.controller';
import { authenticate, isVendedorOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/ventas
 * @desc    Historial de ventas (vendedor: suyas del día; admin: todas). ?today=0 para todo, ?page&limit
 * @access  Private (vendedor o admin)
 */
router.get('/', isVendedorOrAdmin, getVentas);

/**
 * @route   GET /api/v1/ventas/:id
 * @desc    Detalle de una venta
 * @access  Private (vendedor dueño o admin)
 */
router.get('/:id', isVendedorOrAdmin, getVentaById);

/**
 * @route   POST /api/v1/ventas
 * @desc    Registrar una venta del POS con descuento de stock FEFO
 * @access  Private (vendedor o admin)
 */
router.post('/', isVendedorOrAdmin, createVenta);

export default router;
