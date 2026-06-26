# نظام إدارة حضور كرة السلة

نظام متكامل لإدارة فرق ولاعبين وحضور وتقييم جلسات تدريب أكاديمية كرة السلة — بالعربية (RTL).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild lib declarations (run this if DB schema changes)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session (session-based auth, no JWT)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind + shadcn/ui + Wouter
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (source of truth: users, teams, players, sessions, attendance, criteria, evaluations)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated React Query hooks (do not edit manually)
- `lib/api-zod/` — generated Zod schemas (do not edit manually)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/basketball-app/src/pages/` — React pages
- `artifacts/basketball-app/src/lib/auth.tsx` — auth context (useGetMe hook)

## Architecture decisions

- Session-based auth (express-session) instead of JWT — simpler for club internal tool with no mobile app
- `getTeamReport` uses POST (not GET) to avoid Orval TS2308 collision from query params
- CSV export is a direct GET without codegen hook: `/api/reports/team/{id}/export/csv?dateFrom=&dateTo=`
- Head coach sees all teams; coaches only see their own assigned teams
- After any DB schema change, run `pnpm run typecheck:libs` before leaf package typechecks

## Product

- **Login**: session-based, two roles: `head_coach` (admin) and `coach`
- **Dashboard**: summary stats + per-team overview cards
- **Teams**: create/edit/delete teams, assign coaches (head_coach only)
- **Players**: manage roster per team, activate/deactivate players
- **Sessions**: create training sessions per team, view list with attendance counts
- **Session Detail**: mark attendance (present/late/excused/absent) + evaluate each player across criteria (score 1–10)
- **Reports**: filter by team and date range, view per-player attendance % and average evaluation scores, export to CSV
- **Coaches**: manage coach accounts (head_coach only)
- **Criteria**: manage evaluation criteria (head_coach only)

## Default accounts (seed data)

- Head coach: `head` / `admin123`
- Demo coach 1: `coach1` / `coach123`
- Demo coach 2: `coach2` / `coach123`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After DB schema changes: run `pnpm run typecheck:libs` before any leaf package typecheck
- `pnpm run typecheck:libs` must be run after codegen if lib types are stale
- Do not hardcode port; API server reads `PORT` env var from workflow config
- CORS is set to `origin: true, credentials: true` — required for session cookies in dev

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
