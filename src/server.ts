import app from './app';
import { config, validateConfig } from './config/env';

// Validar configuración antes de iniciar el servidor
try {
  validateConfig();
} catch (error: any) {
  console.error('Error en la configuración:', error.message);
  process.exit(1);
}

// Puerto del servidor
const PORT = config.port;

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 Servidor iniciado correctamente');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 Entorno: ${config.nodeEnv}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/${config.apiVersion}`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/${config.apiVersion}/health`);
  console.log('═══════════════════════════════════════════════════════');
});

// Manejo de errores no controlados
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Error no manejado (Promise Rejection):', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err: Error) => {
  console.error('❌ Error no capturado (Uncaught Exception):', err);
  process.exit(1);
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recibido, cerrando servidor gracefully...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT recibido (Ctrl+C), cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

export default server;
