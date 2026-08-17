import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest, RolEnum } from '../types';

/**
 * Middleware para verificar que el usuario está autenticado
 * Valida el JWT token de Supabase Auth
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación',
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar el token con Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        error: authError?.message,
      });
    }

    // Obtener datos del usuario desde nuestra tabla
    const { data: userData, error: dbError } = await supabase
      .from('usuario')
      .select(
        `
        *,
        rol:id_rol (*)
      `
      )
      .eq('id_auth', user.id)
      .eq('estado_logico', true)
      .single();

    if (dbError || !userData) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo',
        error: dbError?.message,
      });
    }

    // Agregar usuario al request
    req.user = {
      id_auth: user.id,
      email: user.email!,
      usuario: userData,
      rol: userData.rol,
    };

    next();
  } catch (error: any) {
    console.error('Error en authenticate middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en la autenticación',
      error: error.message,
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * Uso: authorize([RolEnum.ADMINISTRATIVO, RolEnum.VENDEDOR])
 */
export const authorize = (rolesPermitidos: RolEnum[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      const userRol = req.user.usuario.id_rol;

      if (!rolesPermitidos.includes(userRol)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
          data: {
            rol_usuario: userRol,
            roles_requeridos: rolesPermitidos,
          },
        });
      }

      next();
    } catch (error: any) {
      console.error('Error en authorize middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en la autorización',
        error: error.message,
      });
    }
  };
};

/**
 * Middleware para verificar que el usuario es administrador
 */
export const isAdmin = authorize([RolEnum.ADMINISTRATIVO]);

/**
 * Middleware para verificar que el usuario es vendedor o admin
 */
export const isVendedorOrAdmin = authorize([
  RolEnum.ADMINISTRATIVO,
  RolEnum.VENDEDOR,
]);

/**
 * Middleware para verificar que el usuario es almacenero o admin
 */
export const isAlmaceneroOrAdmin = authorize([
  RolEnum.ADMINISTRATIVO,
  RolEnum.ALMACENERO,
]);
