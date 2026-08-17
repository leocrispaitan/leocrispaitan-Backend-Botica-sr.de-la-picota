import { Request } from 'express';

// Tipos de roles del sistema
export enum RolEnum {
  ADMINISTRATIVO = 1,
  VENDEDOR = 2,
  ALMACENERO = 3,
}

// Interfaz de usuario desde la base de datos
export interface Usuario {
  id_usuario: number;
  id_auth: string;
  email: string;
  dni: string;
  nombre_usuario: string;
  nombre_completo: string;
  id_rol: number;
  foto_perfil_url: string | null;
  telefono: string | null;
  ultimo_acceso: Date | null;
  estado_logico: boolean;
  fecha_registro: Date;
}

// Interfaz de rol
export interface Rol {
  id_rol: number;
  nombre_rol: string;
  descripcion: string | null;
  estado_logico: boolean;
  fecha_registro: Date;
}

// Datos del usuario autenticado (extendido de Request)
export interface AuthUser {
  id_auth: string;
  email: string;
  usuario: Usuario;
  rol: Rol;
}

// Request extendido con usuario autenticado
export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Respuesta estándar de la API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Datos para login
export interface LoginCredentials {
  email: string;
  password: string;
}

// Datos para registro de usuario (solo admin)
export interface RegisterUserData {
  email: string;
  password: string;
  dni: string;
  nombre_usuario: string;
  nombre_completo: string;
  id_rol: number;
  telefono?: string;
}
