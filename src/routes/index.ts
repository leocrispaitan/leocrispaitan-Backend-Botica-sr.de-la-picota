import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';

const router = Router();

console.log('✅ Loading auth routes...');
console.log('Auth routes:', typeof authRoutes, authRoutes);

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de usuarios
router.use('/users', usersRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

export default router;
