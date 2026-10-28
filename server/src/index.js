// App entry point: builds the Express app, adds middleware, mounts the routes, and starts listening.
import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';
import membersRoutes from './routes/members.js';
import documentsRoutes from './routes/documents.js';
import extractRoutes from './routes/extract.js';

const app = express();

// The Vite dev server runs on a different port (= different origin), so the browser needs CORS permission.
app.use(cors({ origin: 'http://localhost:5173' }));
// Parses JSON request bodies into req.body. 10mb because /api/extract receives base64 images.
app.use(express.json({ limit: '10mb' }));

// Every /api route needs a logged-in Supabase user.
app.use('/api', requireAuth);
app.use('/api/members', membersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/extract', extractRoutes);

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
