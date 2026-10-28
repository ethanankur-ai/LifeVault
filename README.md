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
  client/            React + Vite + Tailwind (UI not built yet)
  supabase/schema.sql      tables, security rules, storage bucket
```

## Setup

You need **Node 22+**, a free [Supabase](https://supabase.com) project, and, optionally, a
[Gemini API key](https://aistudio.google.com/apikey) for the auto-fill feature.

### 1. Database

In the Supabase dashboard open **SQL Editor**, paste all of `supabase/schema.sql`, and click **Run**.
This creates the tables, Row Level Security, a private `documents` storage bucket, and a trigger
that gives every new sign-up their own family.

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
| POST | `/api/extract` | Auto-fill: `{ image: "data:image/jpeg;base64,..." }` → `{ doc_type, doc_number, expiry_date, name }`. Returns empty strings if Gemini fails |

## How security works

- The browser logs in with Supabase Auth and sends `Authorization: Bearer <token>` to the API.
- `middleware/auth.js` checks the token, then gives the controllers a Supabase client that acts
  **as that user**.
- The database's Row Level Security policies (in `schema.sql`) only return rows from the user's
  own family. The API code never filters by family; the database does it, so a forgotten filter can't leak data.

## Uploading files (for when you build the UI)

The browser uploads directly to Supabase Storage. Use the bucket `documents` and the path
`<family_id>/<file name>`; the storage policy rejects any other folder. Then call `POST /api/documents`
with that path as `file_path`. The client can read its family id with
`supabase.from('families').select('id').single()`.
