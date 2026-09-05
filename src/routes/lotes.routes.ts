import { Router } from 'express';
import { getAllLotes, getLoteById, createLote, updateLote, deleteLote } from '../controllers/lotes.controller';
import { authenticate, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/lotes
 * @desc    Obtener todos los lotes con su producto y estado de vencimiento
 * @access  Private (requiere autenticación)
 */
router.get('/', getAllLotes);

/**
 * @route   GET /api/v1/lotes/:id
 * @desc    Obtener un lote por su ID
 * @access  Private (requiere autenticación)
 */
router.get('/:id', getLoteById);

/**
 * @route   POST /api/v1/lotes
 * @desc    Registrar un nuevo lote
 * @access  Private (Almacenero o Administrador)
 */
router.post('/', isAlmaceneroOrAdmin, createLote);

/**
 * @route   PUT /api/v1/lotes/:id
 * @desc    Actualizar un lote existente
 * @access  Private (Almacenero o Administrador)
 */
router.put('/:id', isAlmaceneroOrAdmin, updateLote);

/**
 * @route   DELETE /api/v1/lotes/:id
 * @desc    Desactivar (soft delete) un lote
 * @access  Private (Almacenero o Administrador)
 */
router.delete('/:id', isAlmaceneroOrAdmin, deleteLote);

export default router;