import { Router } from 'express';
import {
  getAllFormasFarmaceuticas,
  getFormaFarmaceuticaById,
  createFormaFarmaceutica,
  updateFormaFarmaceutica,
  deleteFormaFarmaceutica,
} from '../controllers/formasFarmaceuticas.controller';
import { authenticate, isAlmaceneroOrAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/formas-farmaceuticas
 * @desc    Obtener todas las formas farmacéuticas con conteo de productos
 * @access  Private (requiere autenticación)
 */
router.get('/', getAllFormasFarmaceuticas);

/**
 * @route   GET /api/v1/formas-farmaceuticas/:id
 * @desc    Obtener una forma farmacéutica con sus productos asociados
 * @access  Private (requiere autenticación)
 */
router.get('/:id', getFormaFarmaceuticaById);

/**
 * @route   POST /api/v1/formas-farmaceuticas
 * @desc    Crear una nueva forma farmacéutica
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.post('/', isAlmaceneroOrAdmin, createFormaFarmaceutica);

/**
 * @route   PUT /api/v1/formas-farmaceuticas/:id
 * @desc    Actualizar forma farmacéutica (nombre y/o estado)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.put('/:id', isAlmaceneroOrAdmin, updateFormaFarmaceutica);

/**
 * @route   DELETE /api/v1/formas-farmaceuticas/:id
 * @desc    Eliminar lógicamente una forma farmacéutica (soft delete)
 * @access  Private (requiere autenticación - almacenero o admin)
 */
router.delete('/:id', isAlmaceneroOrAdmin, deleteFormaFarmaceutica);

export default router;