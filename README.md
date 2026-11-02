# LifeVault

A family document vault: store passports, IDs and policies per family member, search them,
and see what's expiring soon.

```
lifevault/
  server/            Express API (Node, ES modules)
    src/
      index.js             app entry: middleware, routes, error handler
      config/supabase.js   Supabase clients from .env
      middleware/auth.js   checks the login token on every /api request
      routes/              URL → controller mapping
      controllers/         the actual logic for each route
    test/auth.test.js      smoke test: routes reject requests without a token
  client/            React + Vite + Tailwind
    src/
      App.jsx              login gate + tabs (Documents, Add document, Checklists, Members)
      index.css            Tailwind + the "Dossier" theme: colours, fonts, shared classes, animations
      lib/                 supabase.js (browser client), api.js (calls our API with the token), docTypes.js, dates.js
      components/          one file per screen/panel, plus FolderTabs (menu and member filters)
  supabase/schema.sql      tables, security rules, storage bucket
```

## Setup

You need **Node 22+**, a free [Supabase](https://supabase.com) project, and, optionally, a
[Gemini API key](https://aistudio.google.com/apikey) for the auto-fill feature.

### 1. Database

In the Supabase dashboard open **SQL Editor**, paste all of `supabase/schema.sql`, and click **Run**.
This creates the tables, Row Level Security, a private `documents` storage bucket, and a trigger
that gives every new sign-up their own family.

Then run `supabase/002_checklists.sql` the same way. It adds the table for the family's own checklists.

### 2. Server

```bash
cd server
cp .env.example .env     # then fill in the values (see comments inside)
npm install
npm run dev              # http://localhost:4000, restarts on file changes (nodemon)
```

`npm test` runs the smoke test (no Supabase needed).

### 3. Client

```bash
cd client
npm install
cp .env.example .env     # Supabase URL + anon key, API URL
npm run dev              # http://localhost:5173
```

## Trying the API without a frontend

Every `/api` route needs a logged-in user's token.

1. Supabase dashboard → **Authentication → Users → Add user** (tick "Auto Confirm User").
2. Get a token. The `apikey` here is the **anon / publishable** key, not the service key:

   ```bash
   curl -X POST "https://YOUR-PROJECT.supabase.co/auth/v1/token?grant_type=password" \
     -H "apikey: YOUR_ANON_KEY" -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"your-password"}'
   ```

   Copy `access_token` from the response (valid for 1 hour).
3. Call the API:

   ```bash
   TOKEN=paste-it-here
   curl localhost:4000/api/members -H "Authorization: Bearer $TOKEN"
   curl -X POST localhost:4000/api/members -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" -d '{"name":"Asha","relation":"Mother","dob":"1965-04-12"}'
   ```

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET  | `/api/members` | List the family's members |
| POST | `/api/members` | Add a member: `{ name, relation?, dob? }` |
| GET  | `/api/documents?q=&member=&type=` | List documents. `q` searches doc type, number and tags; `member` = member id; `type` = exact doc type |
| GET  | `/api/documents/expiring` | Documents expiring in the next 60 days |
| POST | `/api/documents` | Save metadata: `{ member_id, file_path, doc_type?, doc_number?, expiry_date?, tags?, extracted_json? }` |
| POST | `/api/extract` | Auto-fill: `{ image: "data:image/jpeg;base64,..." }` → `{ doc_type, doc_number, expiry_date, name }`. `doc_type` may be a new category. Returns empty strings if Gemini fails |
| GET  | `/api/doc-types` | Document categories: the built-ins plus every custom one the family uses on documents or checklists |
| GET  | `/api/checklists` | The family's own checklists (the built-in ones live in the client) |
| POST | `/api/checklists` | Save a checklist: `{ name, doc_types: [...] }`. New type names become custom categories |
| POST | `/api/checklists/suggest` | AI draft: `{ situation }` → `{ name, doc_types }`. Returns an empty list if Gemini fails |
| DELETE | `/api/checklists/:id` | Delete one of the family's checklists |

## How security works

- The browser logs in with Supabase Auth and sends `Authorization: Bearer <token>` to the API.
- `middleware/auth.js` checks the token, then gives the controllers a Supabase client that acts
  **as that user**.
- The database's Row Level Security policies (in `schema.sql`) only return rows from the user's
  own family. The API code never filters by family; the database does it, so a forgotten filter can't leak data.

## Deploy

Push the repo to GitHub first. Both parts go on Vercel's free Hobby plan as two projects from the same
repo (Add New → Project, import the repo twice). Vercel only uses environment variables in new deploys,
so redeploy after changing one.

**API**: root directory `server`. Vercel detects Express from `src/index.js`; leave the build settings.
- Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY` (optional), `CLIENT_ORIGIN` = the frontend URL (no trailing slash; set it after the frontend deploy)
- The API runs as one Vercel Function, which accepts requests up to 4.5 MB. That's why Auto-fill shrinks photos before sending them.

**Frontend**: root directory `client` (Vercel detects Vite).
- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` = the API URL (no trailing slash)

Use each project's short domain (Project → Domains, like `lifevault-api.vercel.app`), not a long
deployment URL. Vercel puts the long ones behind its own login, and CORS only allows `CLIENT_ORIGIN`.

## Uploading files

The browser uploads directly to Supabase Storage. Use the bucket `documents` and the path
`<family_id>/<file name>`; the storage policy rejects any other folder. Then call `POST /api/documents`
with that path as `file_path`. The client can read its family id with
`supabase.from('families').select('id').single()`.
