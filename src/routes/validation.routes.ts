import { Router } from 'express';
import { validarDni } from '../controllers/validation.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// RUTAS DE VALIDACIÓN
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/validar-dni
 * Valida un DNI peruano y retorna los datos personales
 * Requiere autenticación
 * Body: { dni: "12345678" }
 */
router.post('/validar-dni', authenticate, validarDni);

export default router;
