// Maps /api/members URLs to controller functions. Routes say "which URL"; controllers say "what happens".
import { Router } from 'express';
import { listMembers, createMember } from '../controllers/membersController.js';

const router = Router();
router.get('/', listMembers);
router.post('/', createMember);

export default router;
