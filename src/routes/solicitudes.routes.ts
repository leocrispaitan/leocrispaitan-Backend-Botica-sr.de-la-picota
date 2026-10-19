import { Router } from 'express';
import {
  createSolicitud,
  getSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
} from '../controllers/solicitudes.controller';
import { authenticate, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/solicitudes
 * @desc    Enviar una solicitud de registro (PÚBLICO — sin autenticación)
 * @access  Public
 */
router.post('/', createSolicitud);

// A partir de aquí, solo el Administrador puede revisar solicitudes
router.use(authenticate);
router.use(isAdmin);

/**
 * @route   GET /api/v1/solicitudes?estado=PENDIENTE
 * @desc    Listar solicitudes (opcionalmente filtradas por estado)
 * @access  Private (Administrativo)
 */
router.get('/', getSolicitudes);

/**
 * @route   PATCH /api/v1/solicitudes/:id/aprobar
 * @desc    Aprobar solicitud y crear la cuenta real del nuevo usuario.
 *          Devuelve la contraseña temporal generada.
 * @access  Private (Administrativo)
 */
router.patch('/:id/aprobar', aprobarSolicitud);

/**
 * @route   PATCH /api/v1/solicitudes/:id/rechazar
 * @desc    Rechazar la solicitud de registro
 * @access  Private (Administrativo)
 */
router.patch('/:id/rechazar', rechazarSolicitud);

export default router;
