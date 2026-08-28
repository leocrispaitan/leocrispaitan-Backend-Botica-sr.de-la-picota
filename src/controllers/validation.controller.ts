import { Request, Response } from 'express';
import { aqpfactService } from '../services/aqpfact.service';

// ═══════════════════════════════════════════════════════════════════
// CONTROLADOR DE VALIDACIONES
// ═══════════════════════════════════════════════════════════════════

/**
 * Valida un DNI peruano y retorna los datos personales
 * POST /api/v1/validar-dni
 * Body: { dni: "12345678" }
 */
export const validarDni = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dni } = req.body;

    // Validar que se haya enviado el DNI
    if (!dni) {
      res.status(400).json({
        success: false,
        message: 'El DNI es requerido',
      });
      return;
    }

    // Validar formato básico del DNI
    if (typeof dni !== 'string' || !/^\d{8}$/.test(dni)) {
      res.status(400).json({
        success: false,
        message: 'El DNI debe contener exactamente 8 dígitos',
      });
      return;
    }

    // Llamar al servicio de validación
    const resultado = await aqpfactService.validarDni(dni);

    // Si la validación fue exitosa
    if (resultado.success) {
      // Generar nombre de usuario sugerido
      const nombreUsuarioSugerido = aqpfactService.generarNombreUsuario(
        resultado.nombreCompleto || ''
      );

      res.status(200).json({
        success: true,
        message: 'DNI validado correctamente',
        data: {
          dni: resultado.dni,
          nombreCompleto: resultado.nombreCompleto,
          nombres: resultado.nombres,
          apellidoPaterno: resultado.apellidoPaterno,
          apellidoMaterno: resultado.apellidoMaterno,
          nombreUsuarioSugerido,
        },
      });
      return;
    }

    // Si hubo un error en la validación
    res.status(404).json({
      success: false,
      message: resultado.error || 'No se pudo validar el DNI',
    });
  } catch (error: any) {
    console.error('❌ Error en validarDni:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al validar el DNI',
    });
  }
};
