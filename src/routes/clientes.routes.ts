import { Router } from 'express';
import { searchClientes } from '../controllers/clientes.controller';
import { authenticate, isVendedorOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/v1/clientes?search=&limit=
 * @desc    Buscar clientes activos para el POS
 * @access  Private (vendedor o admin)
 */
router.get('/', isVendedorOrAdmin, searchClientes);

export default router;
