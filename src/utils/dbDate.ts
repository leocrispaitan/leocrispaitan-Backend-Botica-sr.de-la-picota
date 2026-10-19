import { supabaseAdmin } from '../config/supabase';

/**
 * Obtiene la fecha actual del SERVIDOR de base de datos (CURRENT_DATE),
 * no la del dispositivo/servidor de aplicación. Así los cálculos de
 * vencimiento y cuarentena no se ven afectados por cambios de reloj local.
 */
export const getDbToday = async (): Promise<string> => {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_today');
    if (error || !data) throw error || new Error('Sin fecha');
    return String(data).slice(0, 10);
  } catch {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }
};
