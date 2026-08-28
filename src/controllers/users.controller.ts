import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

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
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre_completo, telefono, foto_perfil_url, id_rol } = req.body;

    // Construir objeto de actualización solo con campos permitidos
    const updateData: any = {};
    if (nombre_completo !== undefined) updateData.nombre_completo = nombre_completo;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (foto_perfil_url !== undefined) updateData.foto_perfil_url = foto_perfil_url;
    if (id_rol !== undefined) updateData.id_rol = id_rol;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar',
      });
      return;
    }

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
