import { Router } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import {
  logout,
  getProfile,
  register,
  refreshToken,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { authenticate, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Intentando login:', { email, password: '***' });

    // Autenticar con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('📊 Respuesta de Supabase:', { 
      hasData: !!data, 
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      error: error?.message 
    });

    if (error) {
      console.error('❌ Error de Supabase:', error);
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
    console.log('🔍 Buscando usuario en BD con id_auth:', data.user.id);
    
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('usuario')
      .select(`*, rol (*)`)
      .eq('id_auth', data.user.id)
      .eq('estado_logico', true)
      .single();

    console.log('📊 Resultado de BD:', { 
      hasUserData: !!userData, 
      dbError: dbError?.message,
      userData: userData ? { 
        id_usuario: userData.id_usuario,
        email: userData.email,
        nombre_completo: userData.nombre_completo 
      } : null
    });

    if (dbError || !userData) {
      console.error('❌ Error al buscar usuario en BD:', dbError);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo',
        debug: { dbError: dbError?.message, id_auth: data.user.id }
      });
    }

    // Actualizar último acceso
    await supabaseAdmin.rpc('fn_actualizar_ultimo_acceso', {
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
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout de usuario
 * @access  Public (ya que el token puede estar expirado)
 */
router.post('/logout', logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario (solo Admin)
 * @access  Private (Admin)
 */
router.post('/register', authenticate, isAdmin, register);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refrescar token de acceso
 * @access  Public
 */
router.post('/refresh', refreshToken);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Solicitar restablecimiento de contraseña
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Restablecer contraseña
 * @access  Public
 */
router.post('/reset-password', resetPassword);

export default router;
