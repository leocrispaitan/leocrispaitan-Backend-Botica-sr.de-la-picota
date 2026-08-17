import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware para validar los resultados de express-validator
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array(),
    });
    return;
  }

  next();
};

/**
 * Wrapper para ejecutar validaciones y verificar resultados
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Ejecutar todas las validaciones
    for (const validation of validations) {
      await validation.run(req);
    }

    // Verificar resultados
    validate(req, res, next);
  };
};
