import { Router } from 'express';
import {
  getAllLaboratorios,
  getLaboratorioById,
  createLaboratorio,
  updateLaboratorio,
  deleteLaboratorio,
} from '../controllers/laboratorios.controller';
import { authenticate, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/laboratorios
 * @desc    Obtener todos los laboratorios con conteo de productos
 * @access  Private (requiere autenticación)
 */
router.get('/', getAllLaboratorios);

/**
 * @route   GET /api/v1/laboratorios/:id
 * @desc    Obtener un laboratorio con sus productos asociados
 * @access  Private (requiere autenticación)
 */
router.get('/:id', getLaboratorioById);

/**
 * @route   POST /api/v1/laboratorios
 * @desc    Crear un nuevo laboratorio
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.post('/', isAlmaceneroOrAdmin, createLaboratorio);

/**
 * @route   PUT /api/v1/laboratorios/:id
 * @desc    Actualizar laboratorio (nombre, país, tipo de entidad y/o estado)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.put('/:id', isAlmaceneroOrAdmin, updateLaboratorio);

/**
 * @route   DELETE /api/v1/laboratorios/:id
 * @desc    Eliminar lógicamente un laboratorio (soft delete)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.delete('/:id', isAlmaceneroOrAdmin, deleteLaboratorio);

export default router;