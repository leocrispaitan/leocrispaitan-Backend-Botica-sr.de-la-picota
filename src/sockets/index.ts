import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config/env';

/**
 * Módulo de realtime (Socket.io).
 *
 * Se conecta al servidor HTTP existente y expone `emitChange(entity, action, record)`
 * para que los controllers notifiquen al frontend (TanStack Query) cuando alguna
 * entidad cambia. El frontend actualiza su caché de forma quirúrgica (upsert/remove)
 * sin necesidad de recargar toda la página ni mostrar "Cargando...".
 */

// Singleton del servidor Socket.io
let io: SocketIOServer | null = null;

/**
 * Inicializa Socket.io sobre el servidor HTTP de Express.
 * Debe llamarse una sola vez al arrancar la aplicación.
 */
export function initSocket(server: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado (Socket.io): ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });

  console.log('⚡ Socket.io inicializado correctamente');
  return io;
}

/** Obtiene la instancia de Socket.io (o null si aún no se ha inicializado). */
export function getIO(): SocketIOServer | null {
  return io;
}

export type EntityName =
  | 'users'
  | 'products'
  | 'categories'
  | 'lotes'
  | 'suppliers'
  | 'viasAdministracion'
  | 'formasFarmaceuticas'
  | 'metodosPago'
  | 'laboratorios'
  | 'purchases';

export type ChangeAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'desactivated';

/**
 * Emite el evento `realtime:change` a todos los clientes conectados.
 * El frontend lo consume en `lib/realtime.tsx` para actualizar la caché
 * de TanStack Query de forma quirúrgica (upsert/remove en la lista).
 */
export function emitChange(
  entity: EntityName,
  action: ChangeAction,
  record?: unknown
): void {
  if (!io) return;
  io.emit('realtime:change', { entity, action, record });
}

export default emitChange;