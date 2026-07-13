Deploying to Render — quick steps

Overview
- This repo contains a `Dockerfile` so Render can build the container.
- We'll use Render's managed Postgres for testing and Render secrets for sensitive values like `JWT_SECRET` and the Firebase JSON.

Prerequisites
- Push this repo to GitHub (or GitLab). Render needs a Git repository to connect.
- Have your Firebase service account JSON available.

Steps
1. Push repository to GitHub
```bash
git add .
git commit -m "Prepare app for Render"
git remote add origin git@github.com:<your-username>/<repo>.git
git push -u origin main
```

2. Create a new Web Service on Render
- Go to https://dashboard.render.com and click "New" → "Web Service".
- Connect your GitHub/GitLab account and choose the repository.
- For `Environment`, choose `Docker` (Render will use the `Dockerfile`).
- Build command: leave blank or `npm ci`.
- Start command: `node server.js`.
- Set the `Port` to `3000` or leave Render's default (the app reads `process.env.PORT`).

3. Add environment variables & secrets in Render
- In the service's "Environment" tab add:
  - `JWT_SECRET` (value)
  - `NODE_ENV=production`
  - DB connection vars will be provided by Render if you provision the Postgres service below.
- Create a new Secret for Firebase JSON:
  - In Render Dashboard, go to "Secrets" → "Create a new secret" and paste the full JSON as the value. Name it `FIREBASE_SERVICE_ACCOUNT_JSON`.
- In the Web Service Environment, set environment variable `FIREBASE_SERVICE_ACCOUNT_JSON` to the secret value.

4. Provision a managed Postgres on Render
- From Render Dashboard click "New" → "Database" → "PostgreSQL".
- Choose plan (Starter) and name (e.g., `tickethub-db`).
- After creation, copy the connection string and set these service env vars:
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` OR set `DATABASE_URL` accordingly.

5. Deploy and verify
- Trigger a deploy from Render; watch the build logs.
- After deploy, visit `https://<your-service>.onrender.com/health` to verify.
- Run your API tests against the public URL.

Notes
- For local dev, continue using `.env`. On Render use secrets.
- If you prefer to store the whole Firebase JSON in a secret, `src/config/firebase.js` already supports `FIREBASE_SERVICE_ACCOUNT_JSON`.
- If you want me to push to GitHub and create the Render service for you, I can generate the exact branch/commit commands and a `render.yaml` template.
