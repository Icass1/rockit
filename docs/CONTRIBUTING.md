# RockIt — Contributing Guide

## Tech Stack

- Frontend: Next.js (React) + TypeScript
- Backend: FastAPI + SQLAlchemy ORM (async)
- Database: PostgreSQL
- Music Providers: Spotify, YouTube

## Architecture

Backend (3 layers):

1. controllers/ — only framework
2. framework/ — only access
3. access/ — only database

Frontend:

- Server Components: page.tsx (no "use client")
- Client Components: \*Client.tsx with hooks
- Business Logic: Managers in lib/managers/
- API Validation: Zod schemas in dto/

## Key Conventions

Backend:

- every function return AResult (never raise)
- static classes + @staticmethod
- everything async
- session scope for DB

Frontend:

- NEVER "use client" in page.tsx
- NEVER business logic in components (use managers)
- ALWAYS validate API with Zod
- absolute imports @/

Database:

- Models: CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded
- tables: singular (user NOT users)
- columns: snake_case

## Running

Backend: `fastapi dev backend/main.py`

Frontend: `cd frontend && pnpm run dev`

Docker: `docker compose up -d --build`
