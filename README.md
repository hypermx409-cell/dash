# DASH0 — Premium Hosting Dashboard

A from-scratch hosting management and server-claim platform integrating with Pterodactyl.

## Stack
- Frontend: Next.js (App Router) + TypeScript + Tailwind + Framer Motion
- Backend: Python 3.12 + FastAPI + SQLAlchemy + Alembic
- Database: PostgreSQL
- Deployment: Docker Compose + Nginx

## Quick start (Docker)
```bash
cd /home/ubuntu/dash0
cp .env.example .env
# edit .env (set SECRET_KEY, PTERO_* etc.)
docker compose up --build -d
```
Frontend: http://YOUR_VPS_IP:3001
Backend health: http://YOUR_VPS_IP:8001/api/health

## Environment variables
See `.env.example`. Important:
- `SECRET_KEY` (required in production)
- `POSTGRES_*`
- `PTERO_PANEL_URL`, `PTERO_API_KEY`
- `PTERO_DEFAULT_NODE_ID`, `PTERO_DEFAULT_EGG_ID`, `PTERO_DEFAULT_NEST_ID`, `PTERO_DEFAULT_ALLOCATION_ID`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (optional seed admin)
- `MAX_SERVERS_PER_USER`

## Local backend dev
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=sqlite:///./dev.db
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

## Local frontend dev
```bash
cd frontend
npm install
npm run dev
```

## Admin setup
- Set `ADMIN_EMAIL`/`ADMIN_PASSWORD` before first run, or promote a user in DB by setting role to admin.
- Admin panel: /admin

## Pterodactyl integration
- Create an Application API key in your panel (Admin > Application API).
- Set `PTERO_PANEL_URL` (e.g. https://panel.example.com) and `PTERO_API_KEY`.
- Set defaults (node/egg/nest/allocation) or discover them via Admin > Pterodactyl page.
- All Pterodactyl traffic is server-side.

## Database migrations
```bash
cd backend
alembic upgrade head
```

## Backups
```bash
docker exec -t <postgres_container> pg_dump -U dash0 dash0 > backup.sql
```
Restore:
```bash
cat backup.sql | docker exec -i <postgres_container> psql -U dash0 -d dash0
```

## Troubleshooting
- If auth hashing errors, ensure bcrypt==4.0.1 (pinned).
- Provisioning requires configured panel; otherwise claims fail with "Pterodactyl not configured".
- Frontend API URL is baked at build time; rebuild frontend after changing NEXT_PUBLIC_API_URL.

## Tests
Backend:
```bash
cd backend
pytest -q
```
Frontend build:
```bash
cd frontend
npm run build
```
```