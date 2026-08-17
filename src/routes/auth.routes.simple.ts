import { Router } from 'express';

const router = Router();

// Ruta de prueba simple
router.post('/login', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Login route works!',
    body: req.body 
  });
});

router.get('/test-auth', (req, res) => {
  res.json({ success: true, message: 'Auth routes are loading!' });
});

export default router;
