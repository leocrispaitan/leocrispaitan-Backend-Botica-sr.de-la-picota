import axios from 'axios';
import { config } from '../config/env';

// ═══════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════

interface AqpfactDniResponse {
  success: boolean;
  data?: {
    dni: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    nombre_completo: string;
    codigo_verificacion?: string;
  };
  message?: string;
}

interface ValidacionDniResult {
  success: boolean;
  dni?: string;
  nombreCompleto?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════
// SERVICIO DE VALIDACIÓN DE DNI
// ═══════════════════════════════════════════════════════════════════

/**
 * Servicio para validar DNI usando la API de APIS AQPFact
 * Este servicio se ejecuta en el backend para mantener seguro el token de la API
 */
class AqpfactService {
  private apiUrl: string;
  private apiToken: string;

  constructor() {
    this.apiUrl = config.aqpfact.apiUrl;
    this.apiToken = config.aqpfact.apiToken;
  }

  /**
   * Valida un DNI peruano y obtiene los datos personales asociados
   * @param dni - DNI de 8 dígitos a validar
   * @returns Resultado de la validación con datos personales
   */
  async validarDni(dni: string): Promise<ValidacionDniResult> {
    try {
      // Validar formato del DNI
      if (!dni || !/^\d{8}$/.test(dni)) {
        return {
          success: false,
          error: 'El DNI debe tener exactamente 8 dígitos numéricos',
        };
      }

      // Verificar que el token esté configurado
      if (!this.apiToken) {
        console.error('❌ Token de APIS AQPFact no configurado');
        return {
          success: false,
          error: 'Servicio de validación no disponible',
        };
      }

      // Realizar petición a la API externa
      console.log(`🔍 Validando DNI: ${dni}`);
      
      const response = await axios.get<AqpfactDniResponse>(
        `${this.apiUrl}/${dni}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            Accept: 'application/json',
          },
          timeout: 10000, // 10 segundos de timeout
        }
      );

      // Procesar respuesta exitosa
      if (response.data.success && response.data.data) {
        const { data } = response.data;
        
        console.log(`✅ DNI validado exitosamente: ${data.nombre_completo}`);

        return {
          success: true,
          dni: data.dni,
          nombreCompleto: data.nombre_completo,
          nombres: data.nombres,
          apellidoPaterno: data.apellido_paterno,
          apellidoMaterno: data.apellido_materno,
        };
      }

      // Respuesta sin datos
      console.warn(`⚠️ DNI no encontrado: ${dni}`);
      return {
        success: false,
        error: 'DNI no encontrado en el registro nacional',
      };
    } catch (error: any) {
      // Manejar errores de la petición
      console.error('❌ Error al validar DNI:', error.message);

      // Error de timeout
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Tiempo de espera agotado. Intenta nuevamente.',
        };
      }

      // Error de conexión
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'No se pudo conectar con el servicio de validación',
        };
      }

      // Error de autenticación (401)
      if (error.response?.status === 401) {
        console.error('❌ Token de APIS AQPFact inválido o expirado');
        return {
          success: false,
          error: 'Error de autenticación con el servicio',
        };
      }

      // Error de rate limit (429)
      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Demasiadas solicitudes. Espera un momento e intenta nuevamente.',
        };
      }

      // Error genérico
      return {
        success: false,
        error: 'Error al validar el DNI. Intenta nuevamente más tarde.',
      };
    }
  }

  /**
   * Genera un nombre de usuario sugerido basado en el nombre completo
   * @param nombreCompleto - Nombre completo de la persona
   * @returns Nombre de usuario sugerido en formato nombre.apellido
   */
  generarNombreUsuario(nombreCompleto: string): string {
    if (!nombreCompleto) return '';

    // Limpiar y normalizar el nombre
    const palabras = nombreCompleto
      .toLowerCase()
      .normalize('NFD') // Normalizar caracteres con tilde
      .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
      .replace(/[^a-z0-9\s]/g, '') // Eliminar caracteres especiales
      .trim()
      .split(/\s+/);

    if (palabras.length === 0) return '';

    // Formato: nombre.apellido (ej: juan.perez)
    if (palabras.length >= 2) {
      return `${palabras[0]}.${palabras[palabras.length - 1]}`;
    }

    // Si solo hay una palabra, usar esa
    return palabras[0];
  }
}

// Exportar instancia única del servicio (Singleton)
export const aqpfactService = new AqpfactService();
