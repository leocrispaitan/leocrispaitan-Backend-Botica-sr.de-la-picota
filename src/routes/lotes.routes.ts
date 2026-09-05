import { Router } from 'express';
import { getAllLotes, createLote } from '../controllers/lotes.controller';
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
 * @route   POST /api/v1/lotes
 * @desc    Registrar un nuevo lote
 * @access  Private (Almacenero o Administrador)
 */
router.post('/', isAlmaceneroOrAdmin, createLote);

export default router;