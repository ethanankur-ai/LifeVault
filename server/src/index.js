// App entry point: builds the Express app, adds middleware, mounts the routes, and starts listening.
import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import membersRoutes from './routes/members.js';
import documentsRoutes from './routes/documents.js';
import extractRoutes from './routes/extract.js';
import checklistsRoutes from './routes/checklists.js';
import docTypesRoutes from './routes/docTypes.js';

const app = express();
app.disable('x-powered-by'); // don't advertise the framework

// The frontend runs on a different origin (Vite dev server, or Vercel in production), so the browser needs CORS permission.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));

// Every /api route needs a logged-in Supabase user. This runs BEFORE the body parser, so anonymous
// callers can't make the server parse a 10 MB body.
app.use('/api', requireAuth);
// Parses JSON request bodies into req.body. 10mb because /api/extract receives base64 images.
app.use(express.json({ limit: '10mb' }));

// The two AI routes cost money per call: at most 20 per user per minute, shared between them.
const aiLimit = rateLimit(20);
app.use('/api/extract', aiLimit);
app.use('/api/checklists/suggest', aiLimit);

app.use('/api/members', membersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/doc-types', docTypesRoutes);

// Unknown /api URLs answer in JSON like every other API error (Express's default is an HTML page).
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler. Express 5 forwards errors thrown in async handlers here automatically,
// so controllers can just `throw` instead of wrapping everything in try/catch.
app.use((err, req, res, next) => {
  // Postgres codes 22xxx / 23xxx mean bad input or a broken constraint, i.e. the client's fault.
  const isDbInputError = /^2[23]/.test(err.code);
  const status = err.status || (isDbInputError ? 400 : 500);
  if (status === 500) console.error(err);
  // Never forward raw database or parser messages (column, constraint and JSON-position details).
  const message =
    status === 500 ? 'Internal server error'
    : isDbInputError ? 'Invalid input'
    : err.type === 'entity.parse.failed' ? 'Request body is not valid JSON'
    : err.message;
  res.status(status).json({ error: message });
});

// On Vercel, Vercel runs this exported app itself (VERCEL is set there), so we only listen locally.
export default app;

const port = process.env.PORT || 4000;
// Exported so the test can shut it down.
export const server = process.env.VERCEL ? null : app.listen(port, () => console.log(`LifeVault API on http://localhost:${port}`));
