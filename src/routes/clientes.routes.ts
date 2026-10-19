import { Router } from 'express';
import {
  searchClientes,
  getAllClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../controllers/clientes.controller';
import { authenticate, isVendedorOrAdmin, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/v1/clientes?search=&limit=
 * @desc    Buscar clientes activos para el POS
 * @access  Private (vendedor o admin)
 */
router.get('/', isVendedorOrAdmin, searchClientes);

/**
 * @route   GET /api/v1/clientes/all
 * @desc    Listado completo de clientes con estadísticas (gestión)
 * @access  Private (almacenero o admin)
 */
router.get('/all', isAlmaceneroOrAdmin, getAllClientes);

/**
 * @route   GET /api/v1/clientes/:id
 * @desc    Obtener un cliente por ID con estadísticas
 * @access  Private (almacenero o admin)
 */
router.get('/:id', isAlmaceneroOrAdmin, getClienteById);

/**
 * @route   POST /api/v1/clientes
 * @desc    Crear un nuevo cliente
 * @access  Private (almacenero o admin)
 */
router.post('/', isAlmaceneroOrAdmin, createCliente);

/**
 * @route   PUT /api/v1/clientes/:id
 * @desc    Actualizar un cliente existente
 * @access  Private (almacenero o admin)
 */
router.put('/:id', isAlmaceneroOrAdmin, updateCliente);

/**
 * @route   DELETE /api/v1/clientes/:id
 * @desc    Desactivar un cliente (soft delete)
 * @access  Private (almacenero o admin)
 */
router.delete('/:id', isAlmaceneroOrAdmin, deleteCliente);

export default router;
