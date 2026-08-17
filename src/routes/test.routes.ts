import { Router } from 'express';

const router = Router();

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test route works!' });
});

export default router;
