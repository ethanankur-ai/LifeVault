// App entry point: builds the Express app, adds middleware, mounts the routes, and starts listening.
import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';
import membersRoutes from './routes/members.js';
import documentsRoutes from './routes/documents.js';
import extractRoutes from './routes/extract.js';
import checklistsRoutes from './routes/checklists.js';
import docTypesRoutes from './routes/docTypes.js';

const app = express();

// The frontend runs on a different origin (Vite dev server, or Vercel in production), so the browser needs CORS permission.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
// Parses JSON request bodies into req.body. 10mb because /api/extract receives base64 images.
app.use(express.json({ limit: '10mb' }));

// Every /api route needs a logged-in Supabase user.
app.use('/api', requireAuth);
app.use('/api/members', membersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/doc-types', docTypesRoutes);

// Central error handler. Express 5 forwards errors thrown in async handlers here automatically,
// so controllers can just `throw` instead of wrapping everything in try/catch.
app.use((err, req, res, next) => {
  // Postgres codes 22xxx / 23xxx mean bad input or a broken constraint, i.e. the client's fault.
  const status = err.status || (/^2[23]/.test(err.code) ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

const port = process.env.PORT || 4000;
// Exported so the test can shut it down.
export const server = app.listen(port, () => console.log(`LifeVault API on http://localhost:${port}`));
