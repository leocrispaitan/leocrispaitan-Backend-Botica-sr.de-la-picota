import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import routes from './routes';
import { errorHandler, notFound } from './middlewares/error.middleware';

// Crear aplicación Express
const app: Application = express();

// =====================================================================
// MIDDLEWARES DE SEGURIDAD Y CONFIGURACIÓN
// =====================================================================

// Helmet: seguridad con headers HTTP
app.use(helmet());

// CORS: permitir peticiones desde el frontend
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Morgan: logging de peticiones HTTP
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parser: parsear JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================================================
// RUTAS
// =====================================================================

// Ruta raíz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🏥 Botica Control API',
    version: config.apiVersion,
    documentation: `/api/${config.apiVersion}/health`,
  });
});

// Rutas de la API
app.use(`/api/${config.apiVersion}`, routes);

// Debug middleware para ver todas las peticiones
app.use((req, res, next) => {
  console.log(`❌ 404 - ${req.method} ${req.url}`);
  next();
});

// =====================================================================
// MANEJO DE ERRORES
// =====================================================================

// Ruta no encontrada (404)
app.use(notFound);

// Manejador global de errores
app.use(errorHandler);

export default app;
