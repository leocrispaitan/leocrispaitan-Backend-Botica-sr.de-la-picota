import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import validationRoutes from './validation.routes';
import productsRoutes from './products.routes';
import categoriesRoutes from './categories.routes';
import lotesRoutes from './lotes.routes';

const router = Router();

console.log('✅ Loading auth routes...');
console.log('Auth routes:', typeof authRoutes, authRoutes);

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de usuarios
router.use('/users', usersRoutes);

// Rutas de validación
router.use('/', validationRoutes);

// Rutas de productos
router.use('/products', productsRoutes);

// Rutas de categorías
router.use('/categories', categoriesRoutes);

// Rutas de lotes
router.use('/lotes', lotesRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

export default router;
