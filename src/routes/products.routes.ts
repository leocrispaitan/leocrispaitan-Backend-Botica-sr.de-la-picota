import { Router } from 'express';
import { getAllProducts, getProductCatalog, createProduct, updateProduct, deleteProduct } from '../controllers/products.controller';
import { authenticate, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/products
 * @desc    Obtener todos los productos con stock real y relaciones
 * @access  Private (requiere autenticación)
 */
router.get('/', getAllProducts);

/**
 * @route   GET /api/v1/products/catalog
 * @desc    Obtener catálogos (categorías, proveedores, etc.) para filtros y formularios
 * @access  Private (requiere autenticación)
 */
router.get('/catalog', getProductCatalog);

/**
 * @route   POST /api/v1/products
 * @desc    Crear un nuevo producto
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.post('/', isAlmaceneroOrAdmin, createProduct);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Actualizar un producto existente
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.put('/:id', isAlmaceneroOrAdmin, updateProduct);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Eliminar un producto (soft delete: estado_logico = false)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.delete('/:id', isAlmaceneroOrAdmin, deleteProduct);

export default router;