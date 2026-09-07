import { Router } from 'express';
import {
  getPurchaseData,
  createPurchase,
  getPurchaseHistory,
  getPurchaseById,
} from '../controllers/purchases.controller';
import { authenticate, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/purchases/data
 * @desc    Obtener productos, proveedores y métodos de pago para el formulario
 * @access  Private (requiere autenticación)
 */
router.get('/data', getPurchaseData);

/**
 * @route   GET /api/v1/purchases
 * @desc    Obtener historial de compras con paginación
 * @access  Private (requiere autenticación)
 */
router.get('/', getPurchaseHistory);

/**
 * @route   GET /api/v1/purchases/:id
 * @desc    Obtener detalle completo de una compra
 * @access  Private (requiere autenticación)
 */
router.get('/:id', getPurchaseById);

/**
 * @route   POST /api/v1/purchases
 * @desc    Registrar una nueva compra
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.post('/', isAlmaceneroOrAdmin, createPurchase);

export default router;
