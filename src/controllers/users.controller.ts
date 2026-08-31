import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

// ═══════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════

interface CreateUserRequest {
  email: string;
  password: string;
  dni: string;
  nombre_usuario: string;
  nombre_completo: string;
  id_rol: number;
  telefono?: string;
  foto_perfil_url?: string;
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN
// ═══════════════════════════════════════════════════════════════════

/**
 * Valida que la contraseña cumpla con los requisitos de Supabase:
 * - Mínimo 8 caracteres
 * - Al menos una letra minúscula
 * - Al menos una letra mayúscula
 * - Al menos un dígito
 */
function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'La contraseña debe tener mínimo 8 caracteres' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'La contraseña debe contener al menos una letra minúscula' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'La contraseña debe contener al menos una letra mayúscula' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'La contraseña debe contener al menos un dígito' };
  }
  return { isValid: true };
}

/**
 * Genera una URL de avatar usando ui-avatars.com basado en el nombre completo
 */
function generateAvatarUrl(nombreCompleto: string): string {
  const nombre = encodeURIComponent(nombreCompleto.trim());
  return `https://ui-avatars.com/api/?name=${nombre}&background=5bcfc5&color=fff&size=200&bold=true`;
}

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR USUARIO
// ═══════════════════════════════════════════════════════════════════

/**
 * Crear un nuevo usuario en Supabase Auth y en la tabla usuario
 * POST /api/v1/users
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      dni,
      nombre_usuario,
      nombre_completo,
      id_rol,
      telefono,
      foto_perfil_url,
    } = req.body as CreateUserRequest;

    // ─────────────────────────────────────────────────────────────
    // VALIDACIONES
    // ─────────────────────────────────────────────────────────────

    // Validar campos requeridos
    if (!email || !password || !dni || !nombre_usuario || !nombre_completo || !id_rol) {
      res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos: email, password, dni, nombre_usuario, nombre_completo, id_rol',
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'El formato del email es inválido',
      });
      return;
    }

    // Validar contraseña
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: passwordValidation.error,
      });
      return;
    }

    // Validar DNI (8 dígitos)
    const dniRegex = /^\d{8}$/;
    if (!dniRegex.test(dni)) {
      res.status(400).json({
        success: false,
        message: 'El DNI debe contener exactamente 8 dígitos',
      });
      return;
    }

    // Validar nombre de usuario (mínimo 4 caracteres)
    if (nombre_usuario.length < 4) {
      res.status(400).json({
        success: false,
        message: 'El nombre de usuario debe tener mínimo 4 caracteres',
      });
      return;
    }

    // Validar teléfono si se proporciona (9 dígitos)
    if (telefono && !/^\d{9}$/.test(telefono)) {
      res.status(400).json({
        success: false,
        message: 'El teléfono debe contener exactamente 9 dígitos',
      });
      return;
    }

    // Validar rol (1=Admin, 2=Vendedor, 3=Almacenero)
    if (![1, 2, 3].includes(id_rol)) {
      res.status(400).json({
        success: false,
        message: 'El rol debe ser 1 (Administrador), 2 (Vendedor) o 3 (Almacenero)',
      });
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // VERIFICAR DUPLICADOS
    // ─────────────────────────────────────────────────────────────

    // Verificar si el email ya existe en Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      res.status(409).json({
        success: false,
        message: 'El email ya está registrado',
      });
      return;
    }

    // Verificar si el DNI ya existe
    const { data: dniCheck } = await supabaseAdmin
      .from('usuario')
      .select('dni')
      .eq('dni', dni)
      .single();

    if (dniCheck) {
      res.status(409).json({
        success: false,
        message: 'El DNI ya está registrado',
      });
      return;
    }

    // Verificar si el nombre de usuario ya existe
    const { data: usernameCheck } = await supabaseAdmin
      .from('usuario')
      .select('nombre_usuario')
      .eq('nombre_usuario', nombre_usuario)
      .single();

    if (usernameCheck) {
      res.status(409).json({
        success: false,
        message: 'El nombre de usuario ya está en uso',
      });
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // CREAR USUARIO EN SUPABASE AUTH
    // ─────────────────────────────────────────────────────────────

    console.log(`\n📝 Creando usuario: ${email}`);

    // Generar URL de avatar si no se proporcionó
    const avatarUrl = foto_perfil_url || generateAvatarUrl(nombre_completo);

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        dni,
        nombre_usuario,
        nombre_completo,
        id_rol,
        telefono: telefono || '',
        foto_perfil_url: avatarUrl,
      },
    });

    if (authError || !authData.user) {
      console.error('❌ Error al crear usuario en Auth:', authError?.message);
      res.status(500).json({
        success: false,
        message: 'Error al crear usuario en el sistema de autenticación',
        error: authError?.message,
      });
      return;
    }

    console.log(`✅ Usuario creado en Auth (ID: ${authData.user.id})`);

    // ─────────────────────────────────────────────────────────────
    // ESPERAR Y VERIFICAR CREACIÓN EN TABLA USUARIO
    // ─────────────────────────────────────────────────────────────

    // Esperar a que el trigger cree el registro (máximo 5 intentos)
    let usuarioCreado = null;
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Esperar 1 segundo

      const { data: usuarioData } = await supabaseAdmin
        .from('usuario')
        .select(`
          id_usuario,
          id_auth,
          email,
          dni,
          nombre_usuario,
          nombre_completo,
          id_rol,
          foto_perfil_url,
          telefono,
          ultimo_acceso,
          estado_logico,
          fecha_registro,
          rol (
            id_rol,
            nombre_rol,
            descripcion
          )
        `)
        .eq('id_auth', authData.user.id)
        .single();

      if (usuarioData) {
        usuarioCreado = usuarioData;
        break;
      }
    }

    if (!usuarioCreado) {
      console.error('⚠️ Usuario creado en Auth pero no en tabla usuario');
      res.status(500).json({
        success: false,
        message: 'Usuario creado pero hubo un error al registrar la información adicional',
      });
      return;
    }

    console.log(`✅ Usuario registrado en base de datos (ID: ${usuarioCreado.id_usuario})`);

    // ─────────────────────────────────────────────────────────────
    // RESPUESTA EXITOSA
    // ─────────────────────────────────────────────────────────────

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: usuarioCreado,
    });
  } catch (error: any) {
    console.error('❌ Error en createUser:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear usuario',
      error: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// OTROS CONTROLADORES
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtener todos los usuarios con sus roles
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: usuarios, error } = await supabaseAdmin
      .from('usuario')
      .select(`
        id_usuario,
        id_auth,
        email,
        dni,
        nombre_usuario,
        nombre_completo,
        id_rol,
        foto_perfil_url,
        telefono,
        ultimo_acceso,
        estado_logico,
        fecha_registro,
        rol (
          id_rol,
          nombre_rol,
          descripcion
        )
      `)
      .order('fecha_registro', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios',
        error: error.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Usuarios obtenidos exitosamente',
      data: usuarios,
    });
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Obtener un usuario por ID
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: usuario, error } = await supabaseAdmin
      .from('usuario')
      .select(`
        id_usuario,
        id_auth,
        email,
        dni,
        nombre_usuario,
        nombre_completo,
        id_rol,
        foto_perfil_url,
        telefono,
        ultimo_acceso,
        estado_logico,
        fecha_registro,
        rol (
          id_rol,
          nombre_rol,
          descripcion
        )
      `)
      .eq('id_usuario', id)
      .single();

    if (error) {
      console.error('❌ Error fetching user:', error);
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        error: error.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Usuario obtenido exitosamente',
      data: usuario,
    });
  } catch (error) {
    console.error('❌ Error in getUserById:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Actualizar estado lógico de un usuario
 */
export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado_logico } = req.body;

    if (typeof estado_logico !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'El campo estado_logico debe ser un booleano',
      });
      return;
    }

    const { data: usuario, error } = await supabaseAdmin
      .from('usuario')
      .update({ estado_logico })
      .eq('id_usuario', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating user status:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar estado del usuario',
        error: error.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Usuario ${estado_logico ? 'activado' : 'desactivado'} exitosamente`,
      data: usuario,
    });
  } catch (error) {
    console.error('❌ Error in updateUserStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Actualizar información de un usuario
 * Permite actualizar: nombre_completo, nombre_usuario, dni, email, telefono, foto_perfil_url, id_rol, estado_logico
 * Si se actualiza el DNI, se valida con la API externa
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      nombre_completo, 
      nombre_usuario, 
      dni, 
      email, 
      telefono, 
      foto_perfil_url, 
      id_rol,
      estado_logico 
    } = req.body;

    // ─────────────────────────────────────────────────────────────
    // VALIDACIONES
    // ─────────────────────────────────────────────────────────────

    // Validar formato de email si se proporciona
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'El formato del email es inválido',
        });
        return;
      }

      // Verificar si el email ya existe en otro usuario
      const { data: emailCheck } = await supabaseAdmin
        .from('usuario')
        .select('id_usuario, email')
        .eq('email', email)
        .neq('id_usuario', id)
        .single();

      if (emailCheck) {
        res.status(409).json({
          success: false,
          message: 'El email ya está registrado por otro usuario',
        });
        return;
      }
    }

    // Validar DNI si se proporciona
    if (dni !== undefined) {
      const dniRegex = /^\d{8}$/;
      if (!dniRegex.test(dni)) {
        res.status(400).json({
          success: false,
          message: 'El DNI debe contener exactamente 8 dígitos',
        });
        return;
      }

      // Verificar si el DNI ya existe en otro usuario
      const { data: dniCheck } = await supabaseAdmin
        .from('usuario')
        .select('id_usuario, dni')
        .eq('dni', dni)
        .neq('id_usuario', id)
        .single();

      if (dniCheck) {
        res.status(409).json({
          success: false,
          message: 'El DNI ya está registrado por otro usuario',
        });
        return;
      }
    }

    // Validar nombre de usuario si se proporciona
    if (nombre_usuario !== undefined) {
      if (nombre_usuario.length < 4) {
        res.status(400).json({
          success: false,
          message: 'El nombre de usuario debe tener mínimo 4 caracteres',
        });
        return;
      }

      // Verificar si el nombre de usuario ya existe en otro usuario
      const { data: usernameCheck } = await supabaseAdmin
        .from('usuario')
        .select('id_usuario, nombre_usuario')
        .eq('nombre_usuario', nombre_usuario)
        .neq('id_usuario', id)
        .single();

      if (usernameCheck) {
        res.status(409).json({
          success: false,
          message: 'El nombre de usuario ya está en uso',
        });
        return;
      }
    }

    // Validar teléfono si se proporciona
    if (telefono !== undefined && telefono !== '' && !/^\d{9}$/.test(telefono)) {
      res.status(400).json({
        success: false,
        message: 'El teléfono debe contener exactamente 9 dígitos',
      });
      return;
    }

    // Validar rol si se proporciona
    if (id_rol !== undefined && ![1, 2, 3].includes(id_rol)) {
      res.status(400).json({
        success: false,
        message: 'El rol debe ser 1 (Administrador), 2 (Vendedor) o 3 (Almacenero)',
      });
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // CONSTRUIR OBJETO DE ACTUALIZACIÓN
    // ─────────────────────────────────────────────────────────────

    const updateData: any = {};
    if (nombre_completo !== undefined) updateData.nombre_completo = nombre_completo;
    if (nombre_usuario !== undefined) updateData.nombre_usuario = nombre_usuario;
    if (dni !== undefined) updateData.dni = dni;
    if (email !== undefined) updateData.email = email;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (foto_perfil_url !== undefined) updateData.foto_perfil_url = foto_perfil_url;
    if (id_rol !== undefined) updateData.id_rol = id_rol;
    if (estado_logico !== undefined) updateData.estado_logico = estado_logico;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar',
      });
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // ACTUALIZAR EN BASE DE DATOS
    // ─────────────────────────────────────────────────────────────

    const { data: usuario, error } = await supabaseAdmin
      .from('usuario')
      .update(updateData)
      .eq('id_usuario', id)
      .select(`
        id_usuario,
        id_auth,
        email,
        dni,
        nombre_usuario,
        nombre_completo,
        id_rol,
        foto_perfil_url,
        telefono,
        ultimo_acceso,
        estado_logico,
        fecha_registro,
        rol (
          id_rol,
          nombre_rol,
          descripcion
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar usuario',
        error: error.message,
      });
      return;
    }

    if (!usuario) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
      return;
    }

    console.log(`✅ Usuario actualizado (ID: ${usuario.id_usuario})`);

    // ─────────────────────────────────────────────────────────────
    // ACTUALIZAR EN SUPABASE AUTH SI ES NECESARIO
    // ─────────────────────────────────────────────────────────────

    if (email !== undefined && usuario.id_auth) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(usuario.id_auth, {
          email: email,
        });
        console.log(`✅ Email actualizado en Auth`);
      } catch (authError) {
        console.warn('⚠️ No se pudo actualizar el email en Auth:', authError);
        // No retornamos error porque la actualización en la tabla usuario fue exitosa
      }
    }

    // ─────────────────────────────────────────────────────────────
    // RESPUESTA EXITOSA
    // ─────────────────────────────────────────────────────────────

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuario,
    });
  } catch (error) {
    console.error('❌ Error in updateUser:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Eliminar usuario (soft delete)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Soft delete - solo cambiar estado_logico a false
    const { data: usuario, error } = await supabaseAdmin
      .from('usuario')
      .update({ estado_logico: false })
      .eq('id_usuario', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario',
        error: error.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      data: usuario,
    });
  } catch (error) {
    console.error('❌ Error in deleteUser:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
