import { body } from 'express-validator';

/**
 * Validaciones para el login
 */
export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
];

/**
 * Validaciones para el registro de usuario
 */
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
  body('dni')
    .isLength({ min: 8, max: 8 })
    .withMessage('El DNI debe tener exactamente 8 dígitos')
    .isNumeric()
    .withMessage('El DNI debe contener solo números'),
  body('nombre_usuario')
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage(
      'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos'
    ),
  body('nombre_completo')
    .isLength({ min: 3, max: 150 })
    .withMessage('El nombre completo debe tener entre 3 y 150 caracteres')
    .trim(),
  body('id_rol')
    .isInt({ min: 1, max: 3 })
    .withMessage('El rol debe ser 1 (Admin), 2 (Vendedor) o 3 (Almacenero)'),
  body('telefono')
    .optional()
    .isLength({ min: 7, max: 20 })
    .withMessage('El teléfono debe tener entre 7 y 20 caracteres'),
];

/**
 * Validaciones para refrescar token
 */
export const refreshTokenValidation = [
  body('refresh_token')
    .notEmpty()
    .withMessage('El refresh token es requerido'),
];
