# Prep Platform — Architecture

Interview-prep platform: DSA sheet + CN/OOP/SD/OS/DBMS content, personalized day-wise
prep plans, progress tracking, and an AI mock-interview module with cross-questions.

## 1. Architectural style

**Modular monolith** — one Node.js codebase, feature-based modules, two entry points
(API process + background worker). Not microservices: no independent scaling need yet,
and splitting solo adds deploy/debug overhead without a real benefit. If a module's load
diverges later (e.g. `interview` becomes LLM-heavy and spiky), it's the natural
extraction candidate — the modular boundaries already exist for that.

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js + Express | |
| Database | MongoDB + Mongoose | Plans and content are naturally nested/variable-shape documents; low need for joins |
| Cache / Queue | Redis + BullMQ | Background LLM calls, rate limiting, caching hot lookups |
| Auth | JWT (access) + opaque refresh token (rotation, httpOnly cookie) | |
| AI | Gemini API | Question generation, answer evaluation, follow-up cross-questions |
| Validation | Zod | |
| Frontend | React + Redux Toolkit + Vite + Tailwind | |
| Realtime | None — turn-by-turn request/response, not sockets | LLM latency (2–4s) doesn't suit chat-style realtime; polling is simpler and sufficient |
| Testing | Jest + Supertest | |
| Deploy | Docker (multi-stage) + AWS ECS | One image, two task definitions: `api` and `worker` |
| CI/CD | GitHub Actions → ECR → ECS | |

## 3. Folder structure

```
prep-platform/
├── backend/
│   ├── src/
│   │   ├── server.js              # API process entrypoint
│   │   ├── worker.js              # background worker entrypoint (BullMQ)
│   │   ├── app.js                 # Express app (no .listen — testable)
│   │   ├── config/                # env validation, Mongo/Redis connections
│   │   ├── modules/
│   │   │   ├── auth/              # Tenant/User, login, signup, tokens
│   │   │   ├── content/           # Topic, Problem — DSA sheet + CN/OOP/SD bank
│   │   │   ├── planner/           # Plan, DayTask — plan generation & scheduling
│   │   │   ├── progress/          # task completion, streaks, catch-up
│   │   │   └── interview/         # InterviewSession, QAExchange — LLM Q&A
│   │   ├── queue/                 # BullMQ queues + processors
│   │   ├── middlewares/           # auth, error handler, rate limiter
│   │   └── utils/
│   ├── seed/
│   │   ├── data/
│   │   │   ├── dsa-sheet.json
│   │   │   └── topics-bank.json
│   │   └── seed.js                # idempotent upsert-based seeding
│   ├── tests/
│   └── Dockerfile
├── frontend/                      # React + Vite dashboard
├── docker-compose.yml             # api + worker + mongo + redis, one command
├── .github/workflows/
└── README.md                      # incl. "design decisions & trade-offs" section
```

Each module internally follows `route → controller → service → model`, so business
logic stays out of Express and is unit-testable on its own.

## 4. Modules → APIs

### `auth`
```
POST   /auth/signup
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
```

### `content` (read-heavy, admin-seeded)
```
GET    /content/topics                     # full topic list (dropdown, plan builder)
GET    /content/dsa-sheet                   # filterable by topic/difficulty
GET    /content/dsa-sheet/:slug
GET    /content/topics/:slug/questions      # CN/OOP/SD/OS/DBMS Q&A for a topic
```

### `planner`
```
POST   /plans                # { topics[], durationDays, startDate } → validates, generates
GET    /plans/active
GET    /plans/:id
PATCH  /plans/:id/extend     # user-triggered catch-up action
```
Synchronous — plan generation is pure computation, no queue needed.

### `progress`
```
GET    /plans/:planId/days/:day
PATCH  /day-tasks/:id                       # mark done / skipped
GET    /plans/:planId/progress              # % complete, streak, overdue count
```

### `interview`
```
POST   /interview-sessions                              # { topic } → first question
POST   /interview-sessions/:id/answer                    # queued LLM job, 202 + jobId
GET    /interview-sessions/:id/exchanges/:exchangeId     # poll for result
GET    /interview-sessions/:id/exchanges                 # full conversation history
```

## 5. Core data model

```
Tenant/User
  └── Plan (topics[], durationDays, startDate, status)
        └── DayTask (day, topicSlug, problemRef?, status, plannedDate)
  └── InterviewSession (topic, status)
        └── QAExchange (question, userAnswer, aiFeedback, followUpQuestion)

Topic (slug, name, topicOrder, category, defaultWeight)
  └── Problem (slug, title, difficulty, link, problemOrder, tags[])
```

## 6. Key decisions worth stating in the README

- **Modular monolith over microservices** — explicit trade-off, not a default.
- **Plan generation**: weighted proportional split (largest-remainder rounding) +
  minimum-days floor per topic + interleaving for spaced repetition, not equal division.
- **Missed days**: no silent auto-reshuffle. Overdue tasks carry forward; a reshuffle
  is only offered as an explicit user choice after 3+ missed days.
- **Cross-questioning**: turn-by-turn request/response, not sockets — matches LLM
  latency and avoids unnecessary realtime infra.
- **Insufficient duration** for chosen topics is rejected with a clear minimum, never
  silently auto-adjusted.
