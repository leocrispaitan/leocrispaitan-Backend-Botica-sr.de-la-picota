import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { emitChange } from '../sockets';
import { AuthRequest } from '../types';

// ═══════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════

interface CreateSolicitudRequest {
  nombre_completo: string;
  email: string;
  telefono?: string;
  dni: string;
  fecha_nacimiento?: string;
  direccion?: string;
  notas?: string;
  id_rol: number;
}

interface SolicitudRow {
  id_solicitud: number;
  nombre_completo: string;
  email: string;
  telefono: string | null;
  dni: string;
  fecha_nacimiento: string | null;
  direccion: string | null;
  notas: string | null;
  id_rol: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fecha_solicitud: string;
  fecha_revision: string | null;
  revisado_por: number | null;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Genera una contraseña temporal que cumple las reglas de Supabase Auth. */
function generateTempPassword(): string {
  const digits = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `Btc${digits}@1`; // mayúscula + minúsculas + dígito + símbolo
}

/** Genera un nombre de usuario único a partir del email. */
async function generateUniqueUsername(email: string): Promise<string> {
  let base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (base.length < 4) base = `${base}usr`;
  if (base.length > 20) base = base.slice(0, 20);

  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(Math.random() * 90) + 10}`;
    const { data } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario')
      .eq('nombre_usuario', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}${Date.now() % 1000}`;
}

/** Genera una URL de avatar basado en el nombre completo. */
function generateAvatarUrl(nombreCompleto: string): string {
  const nombre = encodeURIComponent(nombreCompleto.trim());
  return `https://ui-avatars.com/api/?name=${nombre}&background=5bcfc5&color=fff&size=200&bold=true`;
}

const SOLICITUD_FIELDS = `
  id_solicitud,
  nombre_completo,
  email,
  telefono,
  dni,
  fecha_nacimiento,
  direccion,
  notas,
  id_rol,
  estado,
  fecha_solicitud,
  fecha_revision,
  revisado_por,
  rol (
    id_rol,
    nombre_rol,
    descripcion
  )
`;

const USUARIO_FIELDS = `
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
`;

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: CREAR SOLICITUD (PÚBLICO)
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/solicitudes  (sin autenticación)
 * Cualquier interesado puede postular para integrar la botica.
 */
export const createSolicitud = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre_completo,
      email,
      telefono,
      dni,
      fecha_nacimiento,
      direccion,
      notas,
      id_rol,
    } = req.body as CreateSolicitudRequest;

    // ── VALIDACIONES ──────────────────────────────────────────────
    if (!nombre_completo || !email || !dni || !id_rol) {
      res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos: nombre_completo, email, dni, id_rol',
      });
      return;
    }

    if (nombre_completo.trim().length < 6) {
      res.status(400).json({
        success: false,
        message: 'El nombre completo debe tener al menos 6 caracteres',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'El formato del email es inválido' });
      return;
    }

    if (!/^\d{8}$/.test(dni)) {
      res.status(400).json({
        success: false,
        message: 'El DNI debe contener exactamente 8 dígitos',
      });
      return;
    }

    if (telefono && !/^\d{9}$/.test(telefono)) {
      res.status(400).json({
        success: false,
        message: 'El teléfono debe contener exactamente 9 dígitos',
      });
      return;
    }

    if (![1, 2, 3].includes(id_rol)) {
      res.status(400).json({
        success: false,
        message: 'El rol debe ser 1 (Administrador), 2 (Vendedor) o 3 (Almacenero)',
      });
      return;
    }

    // ── VERIFICAR DUPLICADOS ──────────────────────────────────────
    // ¿Ya es parte del personal?
    const { data: usuarioExistente } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario')
      .or(`email.eq.${email.toLowerCase()},dni.eq.${dni}`)
      .limit(1)
      .maybeSingle();

    if (usuarioExistente) {
      res.status(409).json({
        success: false,
        message: 'Ya existe un usuario del sistema con este email o DNI',
      });
      return;
    }

    // ¿Tiene otra solicitud pendiente?
    const { data: solicitudPendiente } = await supabaseAdmin
      .from('solicitud_registro')
      .select('id_solicitud')
      .eq('estado', 'PENDIENTE')
      .or(`email.eq.${email.toLowerCase()},dni.eq.${dni}`)
      .limit(1)
      .maybeSingle();

    if (solicitudPendiente) {
      res.status(409).json({
        success: false,
        message: 'Ya tienes una solicitud de registro pendiente de revisión',
      });
      return;
    }

    // ── INSERTAR ──────────────────────────────────────────────────
    const { data: solicitud, error } = await supabaseAdmin
      .from('solicitud_registro')
      .insert({
        nombre_completo: nombre_completo.trim(),
        email: email.toLowerCase().trim(),
        telefono: telefono || null,
        dni,
        fecha_nacimiento: fecha_nacimiento || null,
        direccion: direccion || null,
        notas: notas || null,
        id_rol,
        estado: 'PENDIENTE',
      })
      .select(SOLICITUD_FIELDS)
      .single();

    if (error) {
      console.error('❌ Error al crear solicitud:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar la solicitud',
        error: error.message,
      });
      return;
    }

    console.log(`✅ Nueva solicitud de registro (${solicitud.id_solicitud}): ${email}`);
    res.status(201).json({
      success: true,
      message: 'Solicitud enviada exitosamente. Te contactaremos tras revisarla.',
      data: solicitud,
    });
  } catch (error: any) {
    console.error('❌ Error en createSolicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: LISTAR SOLICITUDES (ADMIN)
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/solicitudes
 * Lista todas las solicitudes ordenadas por fecha (más recientes primero).
 */
export const getSolicitudes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { estado } = req.query;

    let query = supabaseAdmin
      .from('solicitud_registro')
      .select(SOLICITUD_FIELDS)
      .order('fecha_solicitud', { ascending: false });

    if (estado && ['PENDIENTE', 'APROBADA', 'RECHAZADA'].includes(String(estado))) {
      query = query.eq('estado', String(estado));
    }

    const { data: solicitudes, error } = await query;

    if (error) {
      console.error('❌ Error al listar solicitudes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las solicitudes',
        error: error.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Solicitudes obtenidas exitosamente',
      data: solicitudes,
    });
  } catch (error: any) {
    console.error('❌ Error en getSolicitudes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: APROBAR SOLICITUD (ADMIN)
// ═══════════════════════════════════════════════════════════════════

/**
 * PATCH /api/v1/solicitudes/:id/aprobar
 * Marca la solicitud como APROBADA y crea el usuario real:
 * - Cuenta en Supabase Auth con contraseña temporal
 * - Fila en la tabla usuario (el trigger de la BD la genera)
 * Devuelve la contraseña temporal para entregarla al nuevo usuario.
 */
export const aprobarSolicitud = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ success: false, message: 'ID de solicitud inválido' });
      return;
    }

    // ── OBTENER SOLICITUD ─────────────────────────────────────────
    const { data: solicitudData, error: fetchError } = await supabaseAdmin
      .from('solicitud_registro')
      .select('*')
      .eq('id_solicitud', id)
      .single();

    const solicitud = solicitudData as SolicitudRow | null;

    if (fetchError || !solicitud) {
      res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
      return;
    }

    if (solicitud.estado !== 'PENDIENTE') {
      res.status(409).json({
        success: false,
        message: `Esta solicitud ya fue procesada (estado: ${solicitud.estado})`,
      });
      return;
    }

    // ── VERIFICAR DUPLICADOS CONTRA EL PERSONAL ACTUAL ────────────
    const { data: duplicado } = await supabaseAdmin
      .from('usuario')
      .select('id_usuario, email, dni')
      .or(`email.eq.${solicitud.email},dni.eq.${solicitud.dni}`)
      .limit(1)
      .maybeSingle();

    if (duplicado) {
      // La solicitud ya no procede: marcar y avisar
      res.status(409).json({
        success: false,
        message: `No se puede aprobar: ya existe un usuario con este email o DNI (usuario #${duplicado.id_usuario})`,
      });
      return;
    }

    // ── PREPARAR CREDENCIALES ─────────────────────────────────────
    const passwordTemporal = generateTempPassword();
    const nombreUsuario = await generateUniqueUsername(solicitud.email);
    const avatarUrl = generateAvatarUrl(solicitud.nombre_completo);

    console.log(`\n📝 Aprobando solicitud #${id}: ${solicitud.email}`);

    // ── CREAR USUARIO EN SUPABASE AUTH ────────────────────────────
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: solicitud.email,
      password: passwordTemporal,
      email_confirm: true,
      user_metadata: {
        dni: solicitud.dni,
        nombre_usuario: nombreUsuario,
        nombre_completo: solicitud.nombre_completo,
        id_rol: solicitud.id_rol,
        telefono: solicitud.telefono || '',
        foto_perfil_url: avatarUrl,
      },
    });

    if (authError || !authData.user) {
      console.error('❌ Error al crear usuario en Auth:', authError?.message);
      res.status(500).json({
        success: false,
        message: 'Error al crear la cuenta en el sistema de autenticación',
        error: authError?.message,
      });
      return;
    }

    console.log(`✅ Usuario creado en Auth (ID: ${authData.user.id})`);

    // ── ESPERAR CREACIÓN DE LA FILA EN TABLA USUARIO (trigger) ────
    let usuarioCreado: any = null;
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const { data } = await supabaseAdmin
        .from('usuario')
        .select(USUARIO_FIELDS)
        .eq('id_auth', authData.user.id)
        .single();
      if (data) {
        usuarioCreado = data;
        break;
      }
    }

    if (!usuarioCreado) {
      console.error('⚠️ Usuario creado en Auth pero no en tabla usuario');
      res.status(500).json({
        success: false,
        message: 'La cuenta se creó pero hubo un error al registrar los datos del usuario',
      });
      return;
    }

    console.log(`✅ Usuario registrado en base de datos (ID: ${usuarioCreado.id_usuario})`);

    // ── ACTUALIZAR SOLICITUD ──────────────────────────────────────
    const revisadoPor = req.user?.usuario?.id_usuario ?? null;
    const { data: solicitudActualizada, error: updateError } = await supabaseAdmin
      .from('solicitud_registro')
      .update({
        estado: 'APROBADA',
        fecha_revision: new Date().toISOString(),
        revisado_por: revisadoPor,
      })
      .eq('id_solicitud', id)
      .select(SOLICITUD_FIELDS)
      .single();

    if (updateError) {
      console.error('⚠️ Error al actualizar estado de solicitud:', updateError);
    }

    // Notificar en tiempo real: se creó un usuario nuevo
    emitChange('users', 'created', usuarioCreado);

    res.status(200).json({
      success: true,
      message:
        'Solicitud aprobada y usuario creado exitosamente. ' +
        'Entrega la contraseña temporal al nuevo usuario (se puede cambiar luego).',
      data: {
        solicitud: solicitudActualizada ?? { ...solicitud, estado: 'APROBADA' },
        usuario: usuarioCreado,
        password_temporal: passwordTemporal,
      },
    });
  } catch (error: any) {
    console.error('❌ Error en aprobarSolicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al aprobar la solicitud',
      error: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR: RECHAZAR SOLICITUD (ADMIN)
// ═══════════════════════════════════════════════════════════════════

/**
 * PATCH /api/v1/solicitudes/:id/rechazar
 * Marca la solicitud como RECHAZADA (con revisor y fechas de auditoría).
 */
export const rechazarSolicitud = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ success: false, message: 'ID de solicitud inválido' });
      return;
    }

    const revisadoPor = req.user?.usuario?.id_usuario ?? null;

    const { data: solicitudData, error } = await supabaseAdmin
      .from('solicitud_registro')
      .update({
        estado: 'RECHAZADA',
        fecha_revision: new Date().toISOString(),
        revisado_por: revisadoPor,
      })
      .eq('id_solicitud', id)
      .eq('estado', 'PENDIENTE') // solo rechaza si sigue pendiente
      .select(SOLICITUD_FIELDS)
      .single();

    if (error || !solicitudData) {
      console.error('❌ Error al rechazar solicitud:', error);
      res.status(409).json({
        success: false,
        message: 'No se pudo rechazar la solicitud (¿ya fue procesada?)',
        error: error?.message,
      });
      return;
    }

    console.log(`✅ Solicitud #${id} rechazada`);

    res.status(200).json({
      success: true,
      message: 'Solicitud rechazada exitosamente',
      data: solicitudData,
    });
  } catch (error: any) {
    console.error('❌ Error en rechazarSolicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
};
