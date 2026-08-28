import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUser,
  deleteUser,
} from '../controllers/users.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/users
 * @desc    Obtener todos los usuarios
 * @access  Private (requiere autenticación)
 */
router.get('/', getAllUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Obtener un usuario por ID
 * @access  Private (requiere autenticación)
 */
router.get('/:id', getUserById);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Actualizar estado de un usuario (activar/desactivar)
 * @access  Private (requiere autenticación - solo admin)
 */
router.patch('/:id/status', updateUserStatus);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Actualizar información de un usuario
 * @access  Private (requiere autenticación - solo admin)
 */
router.put('/:id', updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Eliminar usuario (soft delete)
 * @access  Private (requiere autenticación - solo admin)
 */
router.delete('/:id', deleteUser);

export default router;
