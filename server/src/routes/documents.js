// Maps /api/documents URLs to controller functions.
import { Router } from 'express';
import { listDocuments, listExpiring, createDocument } from '../controllers/documentsController.js';

const router = Router();
router.get('/', listDocuments);
router.get('/expiring', listExpiring);
router.post('/', createDocument);

export default router;
