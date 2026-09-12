import { Router } from 'express';
import {
  getAllMetodosPago,
  getMetodoPagoById,
  createMetodoPago,
  updateMetodoPago,
  deleteMetodoPago,
} from '../controllers/metodosPago.controller';
import { authenticate, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/metodos-pago
 * @desc    Obtener todos los métodos de pago con conteo de ventas
 * @access  Private (requiere autenticación)
 */
router.get('/', getAllMetodosPago);

/**
 * @route   GET /api/v1/metodos-pago/:id
 * @desc    Obtener un método de pago con sus ventas asociadas
 * @access  Private (requiere autenticación)
 */
router.get('/:id', getMetodoPagoById);

/**
 * @route   POST /api/v1/metodos-pago
 * @desc    Crear un nuevo método de pago
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.post('/', isAlmaceneroOrAdmin, createMetodoPago);

/**
 * @route   PUT /api/v1/metodos-pago/:id
 * @desc    Actualizar método de pago (nombre, descripción y/o estado)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.put('/:id', isAlmaceneroOrAdmin, updateMetodoPago);

/**
 * @route   DELETE /api/v1/metodos-pago/:id
 * @desc    Eliminar lógicamente un método de pago (soft delete)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.delete('/:id', isAlmaceneroOrAdmin, deleteMetodoPago);

export default router;