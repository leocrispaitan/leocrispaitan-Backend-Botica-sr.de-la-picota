import { Router } from 'express';
import {
  getAllViasAdministracion,
  getViaAdministracionById,
  createViaAdministracion,
  updateViaAdministracion,
  deleteViaAdministracion,
} from '../controllers/viasAdministracion.controller';
import { authenticate, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/vias-administracion
 * @desc    Obtener todas las vías de administración con conteo de productos
 * @access  Private (requiere autenticación)
 */
router.get('/', getAllViasAdministracion);

/**
 * @route   GET /api/v1/vias-administracion/:id
 * @desc    Obtener una vía de administración con sus productos asociados
 * @access  Private (requiere autenticación)
 */
router.get('/:id', getViaAdministracionById);

/**
 * @route   POST /api/v1/vias-administracion
 * @desc    Crear una nueva vía de administración
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.post('/', isAlmaceneroOrAdmin, createViaAdministracion);

/**
 * @route   PUT /api/v1/vias-administracion/:id
 * @desc    Actualizar vía de administración (nombre y/o estado)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.put('/:id', isAlmaceneroOrAdmin, updateViaAdministracion);

/**
 * @route   DELETE /api/v1/vias-administracion/:id
 * @desc    Eliminar lógicamente una vía de administración (soft delete)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.delete('/:id', isAlmaceneroOrAdmin, deleteViaAdministracion);

export default router;