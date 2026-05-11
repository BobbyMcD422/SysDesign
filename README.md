# Academic Admin

Academic Admin is a system for an accessible academic communication platform. It includes a React frontend, FastAPI backend, PostgreSQL database, role-based user management, JWT authentication, profile/password management, and email-sending support.

## Prerequisites

Install these before running the project:

- Docker Desktop
- Git

For local development without Docker, also install:

- Node.js 22 or newer
- Python 3.12

## Environment Setup

The `.env` file is not committed to Git, so each developer needs to create one in the project root.

Create a file named `.env` next to `docker-compose.yml`:

```env
DB_OWNER=postgres
DB_PASS=password
DB_HOST=db
DB_PORT=5432
DB_NAME=academic_admin
AUTH_KEY=replace-with-a-long-random-secret
EMAIL=your-gmail-address@example.com
```

For this project, `DB_HOST=db` is correct when running with Docker Compose because `db` is the Compose service name. `EMAIL` should be the Gmail account used for sending application emails.

If you run the backend outside Docker, use a local database URL instead:

```env
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5434/academic_admin
AUTH_KEY=replace-with-a-long-random-secret
EMAIL=your-gmail-address@example.com
```

The frontend defaults to `http://localhost:8000` for the API. If needed, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Seed User Setup

The default user seed file is not committed to Git because it may contain default account credentials.

Before running migrations, create this file:

```text
backend/alembic/seeds/default_users.json
```

Use this shape:

```json
[
  {
    "email": "admin@example.com",
    "password": "Admin123",
    "fname": "Admin",
    "lname": "User",
    "role": "admin"
  }
]
```

Passwords must match the application password rules:

- at least 6 characters
- at least one uppercase letter
- at least one lowercase letter
- at least one number

Replace the example values before sharing or presenting the project.

## Running With Docker

From the project root:

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5434`

To stop the app:

```bash
docker compose down
```

To stop the app and remove the database volume:

```bash
docker compose down -v
```

Only use `-v` when you are okay deleting local database data.

## Local Development

### Backend

From the `backend` folder:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The backend runs at:

```text
http://localhost:8000
```

### Frontend

From the `frontend` folder:

```bash
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

## Gmail Integration Setup

Email sending, inbox fetching, and in-site replies use the Gmail API. The OAuth files are local-only and should not be committed.

Before using email features, make sure the root `.env` file has an `EMAIL` value:

```env
EMAIL=your-gmail-address@example.com
```

This should be the Gmail account that owns the OAuth token and sends application emails.

In Google Cloud:

1. Create or select a Google Cloud project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen.
4. Create an OAuth client ID for a desktop app.
5. Download the OAuth client file and save it as `credentials.json`.

Expected local files:
- `credentials.json`
- `token.json`

Keep these out of Git. `token.json` is generated after OAuth login, and `credentials.json` should be supplied privately by whoever owns the Gmail API project.

Place `credentials.json` in one of these locations:

```text
backend/credentials.json
backend/app/email/credentials.json
```

The backend checks both locations when sending, fetching, and replying to Gmail messages.

After `credentials.json` is in place, sign in as an admin and generate the Gmail token from the API docs:

```text
POST /api/email/token/generate
```

You can also check or refresh the token with:

```text
GET /api/email/token/status
POST /api/email/token/refresh
```

The first token generation runs the OAuth login flow and writes `token.json`. If the Gmail scopes change, delete `token.json` and generate it again so the account grants the updated permissions.

If these files are missing, the email-sending route may fail or prompt for OAuth setup depending on the runtime environment.

## Useful Commands

Run frontend type checking:

```bash
cd frontend
npx tsc -b
```

Run frontend linting:

```bash
cd frontend
npm run lint
```

Run backend syntax checks:

```bash
cd backend
python -m py_compile app\main.py app\routes\users_router.py app\routes\mail_router.py auth\services\auth_service.py
```

View Docker logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

## Project Structure

```text
backend/
  app/
    routes/
    helper_functions/
    email/
    models.py
    schemas.py
    database.py
  auth/
  alembic/
frontend/
  src/
    components/
    pages/
    lib/
docker-compose.yml
```

## Notes for Sharing

When sharing the project, send the source code and these setup instructions. Do not send `.env`, `token.json`, `credentials.json`, virtual environments, `node_modules`, or built `dist` output.

The recipient should create their own `.env` file, then run:

```bash
docker compose up --build
```
