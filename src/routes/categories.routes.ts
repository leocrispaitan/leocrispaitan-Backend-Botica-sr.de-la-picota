import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categories.controller';
import { authenticate, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/categories
 * @desc    Obtener todas las categorías con conteo de productos
 * @access  Private (requiere autenticación)
 */
router.get('/', getAllCategories);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Obtener una categoría con sus productos y stock
 * @access  Private (requiere autenticación)
 */
router.get('/:id', getCategoryById);

/**
 * @route   POST /api/v1/categories
 * @desc    Crear una nueva categoría
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.post('/', isAlmaceneroOrAdmin, createCategory);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Actualizar una categoría existente
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.put('/:id', isAlmaceneroOrAdmin, updateCategory);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Eliminar lógicamente una categoría
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.delete('/:id', isAlmaceneroOrAdmin, deleteCategory);

export default router;