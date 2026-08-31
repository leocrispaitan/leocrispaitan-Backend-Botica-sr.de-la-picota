import { Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { AuthRequest, LoginCredentials, RegisterUserData } from '../types';

/**
 * Login de usuario
 * POST /api/auth/login
 */
export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password }: LoginCredentials = req.body;

    // Autenticar con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas',
        error: error.message,
      });
    }

    if (!data.user || !data.session) {
      return res.status(401).json({
        success: false,
        message: 'Error en la autenticación',
      });
    }

    // Obtener datos del usuario desde nuestra tabla
    const { data: userData, error: dbError } = await supabase
      .from('usuario')
      .select(`
        *,
        rol (*)
      `)
      .eq('id_auth', data.user.id)
      .eq('estado_logico', true)
      .single();

    if (dbError || !userData) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo',
      });
    }

    // Actualizar último acceso
    await supabase.rpc('fn_actualizar_ultimo_acceso', {
      user_id: data.user.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id_usuario: userData.id_usuario,
          email: userData.email,
          dni: userData.dni,
          nombre_usuario: userData.nombre_usuario,
          nombre_completo: userData.nombre_completo,
          foto_perfil_url: userData.foto_perfil_url,
          telefono: userData.telefono,
          rol: userData.rol,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      },
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message,
    });
  }
};

/**
 * Obtener perfil del usuario autenticado
 * GET /api/auth/profile
 */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    const { usuario, rol } = req.user;

    return res.status(200).json({
      success: true,
      message: 'Perfil obtenido exitosamente',
      data: {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        dni: usuario.dni,
        nombre_usuario: usuario.nombre_usuario,
        nombre_completo: usuario.nombre_completo,
        foto_perfil_url: usuario.foto_perfil_url,
        telefono: usuario.telefono,
        ultimo_acceso: usuario.ultimo_acceso,
        fecha_registro: usuario.fecha_registro,
        rol: {
          id_rol: rol.id_rol,
          nombre_rol: rol.nombre_rol,
          descripcion: rol.descripcion,
        },
      },
    });
  } catch (error: any) {
    console.error('Error en getProfile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el perfil',
      error: error.message,
    });
  }
};

/**
 * Logout del usuario
 * POST /api/auth/logout
 */
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    console.log('🚪 Procesando logout...');
    
    // Obtener el token del header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Intentar cerrar sesión en Supabase si hay token
        // Usamos supabaseAdmin para tener más control
        const { error } = await supabaseAdmin.auth.admin.signOut(token);
        
        if (error) {
          console.log('⚠️  Error al cerrar sesión en Supabase (puede ser token ya inválido):', error.message);
        } else {
          console.log('✅ Sesión cerrada en Supabase');
        }
      } catch (supabaseError: any) {
        console.log('⚠️  Error de Supabase (ignorado):', supabaseError.message);
      }
    }

    // Siempre retornar éxito, incluso si no hay token
    // El frontend limpiará su localStorage
    console.log('✅ Logout completado exitosamente');
    return res.status(200).json({
      success: true,
      message: 'Logout exitoso',
    });
  } catch (error: any) {
    console.error('❌ Error en logout:', error);
    // Incluso si hay error, retornar éxito para que el frontend limpie el estado
    return res.status(200).json({
      success: true,
      message: 'Logout exitoso',
    });
  }
};

/**
 * Registrar nuevo usuario (solo Admin)
 * POST /api/auth/register
 */
export const register = async (req: AuthRequest, res: Response) => {
  try {
    const {
      email,
      password,
      dni,
      nombre_usuario,
      nombre_completo,
      id_rol,
      telefono,
    }: RegisterUserData = req.body;

    // Validar que el DNI tenga 8 dígitos
    if (dni.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'El DNI debe tener 8 dígitos',
      });
    }

    // Validar que el rol sea válido (1, 2 o 3)
    if (![1, 2, 3].includes(id_rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido. Debe ser 1 (Admin), 2 (Vendedor) o 3 (Almacenero)',
      });
    }

    // Verificar si el email ya existe
    const { data: existingEmail } = await supabaseAdmin
      .from('usuario')
      .select('email')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado',
      });
    }

    // Verificar si el DNI ya existe
    const { data: existingDni } = await supabaseAdmin
      .from('usuario')
      .select('dni')
      .eq('dni', dni)
      .single();

    if (existingDni) {
      return res.status(400).json({
        success: false,
        message: 'El DNI ya está registrado',
      });
    }

    // Verificar si el nombre de usuario ya existe
    const { data: existingUsername } = await supabaseAdmin
      .from('usuario')
      .select('nombre_usuario')
      .eq('nombre_usuario', nombre_usuario)
      .single();

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso',
      });
    }

    // Crear usuario en Supabase Auth con metadatos
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        dni,
        nombre_usuario,
        nombre_completo,
        id_rol,
        telefono: telefono || null,
      },
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al crear usuario',
        error: error.message,
      });
    }

    // El trigger en la base de datos creará automáticamente la fila en la tabla usuario

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        id_auth: data.user.id,
        email: data.user.email,
        nombre_completo,
        nombre_usuario,
        dni,
      },
    });
  } catch (error: any) {
    console.error('Error en register:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message,
    });
  }
};

/**
 * Refrescar token de acceso
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token requerido',
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido o expirado',
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token renovado exitosamente',
      data: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      },
    });
  } catch (error: any) {
    console.error('Error en refreshToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al refrescar token',
      error: error.message,
    });
  }
};

/**
 * Solicitar restablecimiento de contraseña
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido',
      });
    }

    // Verificar si el usuario existe en nuestra base de datos
    const { data: userData } = await supabaseAdmin
      .from('usuario')
      .select('email, estado_logico')
      .eq('email', email)
      .single();

    // Por seguridad, siempre retornamos éxito aunque el usuario no exista
    // Esto evita que se pueda verificar qué emails están registrados
    if (!userData || !userData.estado_logico) {
      return res.status(200).json({
        success: true,
        message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña',
      });
    }

    // Enviar email de restablecimiento usando Supabase Auth
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
    });

    if (error) {
      console.error('Error al enviar email de restablecimiento:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar el correo de restablecimiento',
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña',
    });
  } catch (error: any) {
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message,
    });
  }
};

/**
 * Restablecer contraseña
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { access_token, new_password } = req.body;

    if (!access_token || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Token de acceso y nueva contraseña son requeridos',
      });
    }

    // Validar requisitos de contraseña (incluyendo carácter especial requerido por Supabase)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,}$/;
    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un dígito y un carácter especial',
      });
    }

    // Obtener el usuario desde el token de recuperación
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(access_token);
    
    if (userError || !userData.user) {
      console.error('Error al obtener usuario con token:', userError);
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado',
        error: userError?.message,
      });
    }

    // Actualizar contraseña usando el ID del usuario
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Error al actualizar contraseña:', updateError);
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar la contraseña',
        error: updateError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error: any) {
    console.error('Error en resetPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al restablecer la contraseña',
      error: error.message,
    });
  }
};
