// Maps /api/extract to the Gemini auto-fill controller.
import { Router } from 'express';
import { extract } from '../controllers/extractController.js';

const router = Router();
router.post('/', extract);

export default router;
