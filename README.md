# Precision in Legal Management

Premium legal-operations demo built with:

- `React + Vite + Tailwind` on the frontend
- `FastAPI` on the backend
- `MySQL` for case, people, ticket, billing, and document data

The current demo has been reshaped around a cleaner, more editorial UI and a
larger seeded dataset. The sample database now includes a broad
`Suits`-inspired roster, role access mapping, richer case staffing, hearings,
documents, billing rows, and support activity.

## Frontend

Install dependencies from the repository root:

```powershell
npm install
```

Run the frontend:

```powershell
npm run dev
```

Build the frontend:

```powershell
npm run build
```

The frontend talks to `http://127.0.0.1:8000` by default. Override it with
`VITE_API_BASE_URL` when needed.

## Backend

Install backend dependencies:

```powershell
python -m pip install -r .\backend\requirements.txt
```

Run the API from the repository root:

```powershell
uvicorn backend.app.main:app --reload
```

The API exposes these main routes:

- `GET /`
- `GET /health`
- `GET /overview`
- `GET /analytics`
- `GET /cases`
- `GET /cases/{case_id}`
- `GET /clients`
- `GET /tickets`
- `GET /employees`
- `GET /roles`
- `POST /cases`
- `POST /tickets`
- `POST /upload-document/`

Open `http://127.0.0.1:8000/docs` for the interactive API docs.

## Database Setup

The SQL files live in `backend/sql`.

Recommended setup from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -ResetDatabase -IncludeSampleData
```

When `-IncludeSampleData` is used, the script also creates placeholder files in
`/uploads` for the seeded document records so the document feed and download
links have matching local assets.

Useful options:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -User root
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -ServerHost localhost
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -MysqlPath "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -ResetDatabase
powershell -ExecutionPolicy Bypass -File .\backend\sql\init_db.ps1 -ResetDatabase -IncludeSampleData
```

If you prefer to run SQL manually, load these files in order from the MySQL
client:

```sql
SOURCE backend/sql/schema.sql;
SOURCE backend/sql/triggers.sql;
SOURCE backend/sql/procedures.sql;
SOURCE backend/sql/sample_data.sql;
```

Use `-ResetDatabase` only when you want to drop and recreate the `lawfirm`
database from scratch.
