# LifeVault roadmap

Delivered feature by feature, the way we would ship it to a client. Each feature works end to end
(database → API → screen) before the next one starts.

Status: ✅ built · 🚧 in progress · ⬜ not started

| # | Feature | What the family gets | Status |
|---|---|---|---|
| 1 | Authentication | Sign up, log in, log out. Each sign-up gets its own private family vault | ✅ |
| 2 | Family members | Add and list members (name, relation, date of birth) | ✅ |
| 3 | Document upload | Upload a file for a member, with type, number, expiry and tags | ✅ |
| 4 | Find documents | Search by text, filter by member or type, open the file | ✅ |
| 5 | AI auto-fill | One click reads a document photo and fills in the form | ✅ |
| 6 | Expiry alerts | "Expiring soon" panel for documents expiring within 60 days | ✅ |
| 7 | Scenario checklists | "School admission", "Hospital visit", "Passport renewal": what's ready, what's missing | ✅ |
| 8 | Go live | Frontend on Vercel, API on Render | 🚧 code ready, you deploy |

If time runs short, cut in this order: 7 → 8 (demo locally) → 5 → 6. Features 1–4 are the core loop.

---

## Before anything runs: one-time setup

- [ ] Create a Supabase project. In **SQL Editor**, run all of `supabase/schema.sql`
- [ ] Go to **Authentication → Sign In / Providers → Email** and turn off **Confirm email** (demo sign-ups then work instantly)
- [ ] Copy from **Project Settings → API**: the project URL, the **anon** key and the **service_role** key
- [ ] Create `server/.env` from `server/.env.example`: URL + service_role key (+ Gemini key, optional)
- [ ] Create `client/.env` from `client/.env.example`: URL + anon key + API URL
- [ ] Optional: get a Gemini API key at https://aistudio.google.com/apikey

## Go live checklist (Feature 8, steps in README → Deploy)

- [ ] `git init`, commit, push to a new GitHub repo (`.env` files are already git-ignored)
- [ ] Render: create the API web service and set its env vars
- [ ] Vercel: create the frontend project and set its env vars (`VITE_API_URL` = Render URL)
- [ ] Render: set `CLIENT_ORIGIN` = Vercel URL, then redeploy
- [ ] Supabase → Authentication → URL Configuration: set Site URL to the Vercel URL
- [ ] Smoke test on a phone: sign up → add member → upload → search → open

---

## Explore later: learning checklist

Go through these after the app works. Each one points at the files to read and a way to test them.

### Backend basics (already built)
- [ ] **Request lifecycle**: read `server/src/index.js` from top to bottom: CORS → JSON parser → `requireAuth` → router → controller → error handler
- [ ] **Routes vs controllers**: compare `routes/members.js` (which URL) with `controllers/membersController.js` (what happens)
- [ ] **Auth middleware**: read `middleware/auth.js`. How does `req.db` end up acting "as the user"?
- [ ] **Row Level Security**: in `supabase/schema.sql`, find `my_family_id()` and the `"own family"` policies. Why does the API never filter by `family_id`?
- [ ] **Express 5 async errors**: why the controllers `throw` instead of using try/catch (see the error handler in `index.js`)
- [ ] Run `cd server && npm test` and read `test/auth.test.js`
- [ ] Try the API with curl, following "Trying the API without a frontend" in `README.md`

### Per feature
- [ ] **F1 Auth**: `client/src/lib/supabase.js`, `client/src/components/Login.jsx`, `client/src/App.jsx`. Sign up → check that a new row appears in the `families` table (the sign-up trigger in `schema.sql`)
- [ ] **F2 Members**: `client/src/lib/api.js` (how the token reaches `requireAuth`), `client/src/components/Members.jsx`. Open DevTools → Network, add a member, and inspect the `POST /api/members` request and its `Authorization` header
- [ ] **F3 Upload**: `client/src/components/UploadForm.jsx`, `client/src/lib/docTypes.js`. Follow the two steps: file → Supabase Storage (browser, direct) → details → `POST /api/documents` → `createDocument` in `documentsController.js`. Why is the file deleted again if step 2 fails? Check the file in Supabase **Storage → documents**
- [ ] **F4 Find**: `client/src/components/DocumentList.jsx` → `listDocuments` in `documentsController.js` → the `documents_search` view in `schema.sql`. Why signed URLs (the bucket is private)? What does the `ignore` flag in `useEffect` prevent?
- [ ] **F5 Auto-fill**: `handleAutoFill` in `UploadForm.jsx` → `extract` in `server/src/controllers/extractController.js`. How does `responseJsonSchema` force Gemini to answer in JSON? Why does the endpoint return 200 with empty fields instead of an error?
- [ ] **F6 Expiry**: `client/src/components/ExpiringPanel.jsx` → `listExpiring` in `documentsController.js`. Why compare dates as `YYYY-MM-DD` strings?
- [ ] **F7 Checklists**: `client/src/components/Scenarios.jsx` + `SCENARIOS` in `docTypes.js`. All the logic is in the browser: when would you move it to the server?
- [ ] **F8 Deploy**: `CLIENT_ORIGIN` in `server/src/index.js` (what CORS protects), `--env-file-if-exists` in `server/package.json`, and why `VITE_*` values are public while `SUPABASE_SERVICE_KEY` must never reach the browser
- [ ] **Theme (Dossier)**: `client/src/index.css`. How `@theme` tokens become Tailwind classes (`bg-paper`, `text-danger`), the shared classes (`.field`, `.btn`, `.stamp`), and why animations switch off under `prefers-reduced-motion`. Then `FolderTabs.jsx`: one component used for the main menu and the member filters
