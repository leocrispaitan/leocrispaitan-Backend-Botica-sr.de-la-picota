import { Router } from 'express';
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/suppliers.controller';
import { authenticate, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/suppliers
 * @desc    Obtener todos los proveedores con estadísticas reales de compras
 * @access  Private (requiere autenticación)
 */
router.get('/', getAllSuppliers);

/**
 * @route   GET /api/v1/suppliers/:id
 * @desc    Obtener un proveedor con sus productos asociados
 * @access  Private (requiere autenticación)
 */
router.get('/:id', getSupplierById);

/**
 * @route   POST /api/v1/suppliers
 * @desc    Crear un nuevo proveedor
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.post('/', isAlmaceneroOrAdmin, createSupplier);

/**
 * @route   PUT /api/v1/suppliers/:id
 * @desc    Actualizar proveedor (datos y/o estado)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.put('/:id', isAlmaceneroOrAdmin, updateSupplier);

/**
 * @route   DELETE /api/v1/suppliers/:id
 * @desc    Eliminar lógicamente un proveedor (soft delete)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.delete('/:id', isAlmaceneroOrAdmin, deleteSupplier);

export default router;