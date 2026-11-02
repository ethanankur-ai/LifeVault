// Maps /api/doc-types to its controller.
import { Router } from 'express';
import { listDocTypes } from '../controllers/docTypesController.js';

const router = Router();
router.get('/', listDocTypes);

export default router;
