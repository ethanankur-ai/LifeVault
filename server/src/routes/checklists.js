// Maps /api/checklists URLs to controller functions.
import { Router } from 'express';
import { listChecklists, createChecklist, deleteChecklist, suggestChecklist } from '../controllers/checklistsController.js';

const router = Router();
router.get('/', listChecklists);
router.post('/', createChecklist);
router.post('/suggest', suggestChecklist);
router.delete('/:id', deleteChecklist);

export default router;
