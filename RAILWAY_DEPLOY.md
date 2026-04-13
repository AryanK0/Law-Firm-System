# Railway Deploy Guide

## Recommended structure

Create one Railway project with 3 services:

1. `mysql`
2. `backend`
3. `frontend`

## 1. MySQL service

Create a MySQL service from Railway's template.

Use the generated variables from that service:

- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLDATABASE`

## 2. Backend service

Deploy the same repo to a service named `backend`.

Use these settings:

- Root Directory: `/`
- Build Command:

```bash
pip install -r backend/requirements.txt
```

- Start Command:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Set these variables on the backend service:

- `DB_HOST=${{MYSQLHOST}}`
- `DB_PORT=${{MYSQLPORT}}`
- `DB_USER=${{MYSQLUSER}}`
- `DB_PASSWORD=${{MYSQLPASSWORD}}`
- `DB_NAME=${{MYSQLDATABASE}}`
- `CORS_ORIGINS=https://your-frontend-domain.up.railway.app`

Optional later:

- `UPLOAD_DIR=/app/uploads`

Generate a public Railway domain for the backend.

Test:

- `/health`
- `/docs`

## 3. Seed the database

From your local machine, run:

```powershell
.\backend\sql\init_db.ps1 `
  -User "<MYSQLUSER>" `
  -Password "<MYSQLPASSWORD>" `
  -ServerHost "<RAILWAY_TCP_PROXY_DOMAIN>" `
  -Port <RAILWAY_TCP_PROXY_PORT> `
  -IncludeSampleData
```

Only use `-ResetDatabase` if you intentionally want to wipe the Railway DB first.

## 4. Frontend service

Deploy the same repo to a service named `frontend`.

Use these settings:

- Root Directory: `/frontend`
- Build Command:

```bash
npm install && npm run build
```

- Start Command:

```bash
npx serve -s dist -l $PORT
```

Set this variable on the frontend service:

- `VITE_API_BASE_URL=https://your-backend-domain.up.railway.app`

Generate a public Railway domain for the frontend.

## 5. Final backend CORS update

After the frontend domain exists, update backend:

- `CORS_ORIGINS=https://your-frontend-domain.up.railway.app`

If you later add a custom frontend domain, append it:

```text
https://your-frontend-domain.up.railway.app,https://app.yourdomain.com
```

## 6. Deploy order

1. Push code to GitHub
2. Create Railway project
3. Add MySQL
4. Add backend
5. Generate backend domain
6. Seed DB from local machine
7. Confirm backend `/health`
8. Add frontend
9. Generate frontend domain
10. Update backend `CORS_ORIGINS`
11. Test app end-to-end

## 7. Important note about uploads

For the first deployment, keep uploads exactly as they are now.

Do **not** move to a Railway volume until the app is live and verified.

Reason:

- your current repo already contains demo uploads
- mounting an empty persistent directory too early can hide expected files

Once the app is stable, you can migrate uploads to a volume or object storage.
