# Project progress (last 7 days)

**Window:** Aug 16–22, 2025 (IST)

This is what I built, why I built it, and the impact.

---

## At a glance

- **Architecture:** moved to CQRS with clear command/query separation. Added base classes + decorators. AutoMapper handles object mapping.
- **Core domains:** Task, User with clean mapping and repositories. Search + filter + pagination.
- **Platform:** docker-compose dev stack (PostgreSQL, Redis). One command to start.
- **Features:** full Task CRUD, batch actions, status updates, overdue handling, stats.
- **Queue:** job queue integrated for batch jobs. Fixed how jobs are added and processed reliably.
- **Security:** JWT env fix, session management, RBAC, refresh token strategy, rate limiting.
- **Reliability:** health checks (readiness + liveness). Strong exception filter.
- **Observability:** detailed request/response logging with safe error handling.
- **DX:** cleaned imports, consistent DTOs and mappers, modular Users/Auth wiring.

---

## Why it’s like this

- **CQRS** keeps writes and reads simple and testable. Handlers do one thing. Easier scaling later.
- **AutoMapper** avoids manual mapping noise. Less boilerplate, fewer bugs.
- **Repository pattern** keeps data access behind an interface. Swappable later (e.g., different DB or caching layer).
- **Redis + rate limiting** protects APIs and lets us apply backpressure. Safer under bursts.
- **Job queue** makes batch task operations reliable and scalable. Fixed how jobs are queued so batch actions run consistently.
- **JWT + refresh + sessions** give stateless auth with control. We can revoke sessions, rotate tokens, and audit.
- **Health checks + logging + exception filter** cut mean‑time‑to‑diagnose. Fail fast, log well, return typed errors.
- **docker-compose** makes local dev reliable and fast. Parity with prod services.

---

## What I achieved

- Clear CQRS structure across tasks (commands + queries).
- Full Task lifecycle: create, read, update, delete, batch actions, status, overdue.
- Job queue wired for batch processing, with fixes to ensure jobs are added and consumed properly.
- Searchable and pageable task lists (filters + pagination).
- Safer auth flow with refresh tokens and roles. Correct JWT envs.
- Rate‑limited endpoints (including Users) with simple decorator.
- Health endpoints for PostgreSQL/Redis and app readiness.
- Consistent logging and error responses. Easier debugging.
- Faster local setup: `docker compose up` brings Redis + Postgres.

---

## Day‑by‑day

### Day 1 — Aug 16

- **feat:** docker‑compose for dev (Redis, PostgreSQL).
- **chore:** package.json with AutoMapper + NestJS CQRS deps.
- **feat:** wire AutoMapper and CQRS into app.
- **feat:** CQRS base classes + decorators (commands/queries).
- **feat:** Task and User domain models with mapping.
- **feat:** Task filtering (TaskFilterDto, TaskFilterQuery).
- **feat:** Task repository with search.
- **refactor:** TasksController now uses CQRS for reads.
- **fix:** JWT secret and expiration env variable names.
- **chore:** removed unused imports/comments.
- **test:** added User filter DTO (placeholder for future).

**Why/impact:** set the foundation. Clean domain, consistent mapping, and a dev stack that just works.

---

### Day 2 — Aug 17

- **feat(tasks):** CRUD with CQRS.
- Added command handlers for create/update/delete and **batch** processing.
- New DTOs for create/update/delete/batch.
- Better filtering with **pagination** in repository.
- Query handlers for stats and single‑task reads.
- Repository interface updated for new operations.
- Mapper profile updated for new shapes.
- Error handling + logging improved inside handlers.
- Enums for task actions to keep batch ops strict.
- **queue:** added job queue support for batch jobs. Fixed queue logic so jobs run reliably.

**Why/impact:** full task lifecycle is live. Reads and writes are isolated. Batch processing now uses a proper queue, which makes it reliable and scalable.

---

### Day 3 — Aug 18

- **feat(tasks):** update task status + overdue tasks.

**Why/impact:** automated housekeeping. Users get accurate status without manual work.

---

### Day 4 — Aug 19

- **feat(tasks):** rate limiting and task processing tweaks (new configs/actions).

**Why/impact:** protects endpoints and keeps the queue healthy under load.

---

### Day 5 — Aug 20

- **feat(health):** health check endpoints with comprehensive checks.

**Why/impact:** ops can see if DB/Redis/app are healthy. Good for probes and alerts.

---

### Day 6 — Aug 21

- **feat(auth):** session management, RBAC, refresh token strategy.

**Why/impact:** stable auth with control over sessions. Clean role checks.

---

### Day 7 — Aug 22

- **feat(logging):** detailed request/response logging; safe error logging.
- **feat(exception):** HTTP exception filter with consistent responses.
- **feat(rate‑limit):** decorator in UsersController.
- **fix(tasks):** stats response type tightened.
- **feat(users):** UsersModule imports AuthModule for clear boundaries.

**Why/impact:** better traceability, safer errors, and cleaner module wiring.

---

## Improvements over the week

- **Structure:** commands/queries are small and focused. Base classes + decorators reduce copy‑paste.
- **Types:** DTOs and responses are explicit. Safer refactors.
- **Performance:** repo filters + pagination avoid heavy payloads.
- **Queue reliability:** batch task operations now use a proper job queue. Fixed job submission/processing bugs.
- **Security:** correct JWT envs, RBAC, refresh flows, rate limit.
- **Reliability:** health checks + exception filter make failures obvious.
- **DX:** dockerized services, fewer imports, cleaner controllers.

---

## Notes on contribution

- I led the CQRS adoption (base classes, decorators, handlers).
- I implemented Task domain (CRUD, batch, status, overdue, filters, stats) and the repository.
- I wired AutoMapper profiles across Task/User and updated DTO mapping.
- I set up docker‑compose (Redis/PostgreSQL) for dev.
- I fixed JWT env names and added refresh token strategy with sessions + RBAC.
- I added health checks, logging interceptor, and the HTTP exception filter.
- I integrated rate limiting (including UsersController decorator) and cleaned modules (Users ↔ Auth).
- I added job queue support for batch jobs and fixed queue logic to make processing consistent.

