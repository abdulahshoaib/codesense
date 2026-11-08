# @codesense/api

Express + TypeScript REST API for CodeSense, backed by MongoDB through Mongoose.

## Stack

| Concern    | Choice                   |
| ---------- | ------------------------ |
| HTTP       | Express 5                |
| Language   | TypeScript               |
| Database   | MongoDB + Mongoose       |
| Validation | Zod (shared schemas)     |
| Auth       | JSON Web Tokens + bcrypt |
| Logging    | Pino / pino-http         |

## Architecture

Modules are feature-oriented. Each module separates HTTP handling (controller), business
logic (service), persistence (model), and input validation (schema).

```
src/
├── config/       env.ts (Zod-validated), database.ts, logger.ts
├── middleware/   authenticate.ts, validate.ts, error-handler.ts, not-found.ts
├── modules/
│   ├── auth/         controller · service · routes · schema
│   ├── users/        model · service · controller · routes · types
│   ├── repositories/ model · service · controller · routes · schema · types
│   └── scans/        model · service · controller · routes · schema · types
├── routes/       index.ts (versioned router), health.routes.ts
├── services/     token.service.ts (JWT signing/verification)
├── utils/        ApiError, async-handler, response, zod-error
├── app.ts        Express app factory (no database side effects)
└── server.ts     startup: connect DB, listen, graceful shutdown
```

Request flow: `route → middleware (auth/validation) → controller → service → model → MongoDB`.
Controllers never run queries directly, and services never touch `req`/`res`.
`createApp()` is separate from `server.ts` so the app can be built in tests without a
database.

## Environment

Copy `.env.example` to `.env`. Variables are validated with Zod at startup and the process
fails fast if anything required is missing or malformed.

| Variable         | Required | Notes                                                            |
| ---------------- | -------- | ---------------------------------------------------------------- |
| `NODE_ENV`       | no       | `development` \| `test` \| `production` (default `development`)  |
| `PORT`           | no       | Default `5000`                                                   |
| `MONGODB_URI`    | yes      | Never hardcode credentials; keep this in `.env`                  |
| `JWT_SECRET`     | yes      | Must be at least 32 characters                                   |
| `JWT_EXPIRES_IN` | no       | Default `1d`                                                     |
| `CORS_ORIGIN`    | no       | Comma-separated origins, or `*`. Default `http://localhost:5173` |
| `LOG_LEVEL`      | no       | Pino level (default `info`)                                      |

## Scripts

| Command                                  | Description                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `pnpm --filter @codesense/api dev`       | `tsx watch src/server.ts`                       |
| `pnpm --filter @codesense/api build`     | Compile TypeScript to `dist/`                   |
| `pnpm --filter @codesense/api start`     | Run the compiled server (`node dist/server.js`) |
| `pnpm --filter @codesense/api lint`      | ESLint                                          |
| `pnpm --filter @codesense/api typecheck` | `tsc --noEmit` (includes tests)                 |
| `pnpm --filter @codesense/api test`      | Vitest                                          |

## Endpoints

Base path for the versioned API is `/api/v1`.

| Method | Path                             | Auth | Description                                                |
| ------ | -------------------------------- | ---- | ---------------------------------------------------------- |
| GET    | `/health`                        | no   | App status + database connectivity, environment, timestamp |
| GET    | `/api/v1`                        | no   | API version banner                                         |
| POST   | `/api/v1/auth/register`          | no   | Create an account, returns a JWT + public user             |
| POST   | `/api/v1/auth/login`             | no   | Exchange credentials for a JWT + public user               |
| GET    | `/api/v1/auth/me`                | yes  | Current authenticated user                                 |
| GET    | `/api/v1/users/me`               | yes  | Current user profile                                       |
| POST   | `/api/v1/repositories`           | yes  | Register a repository                                      |
| GET    | `/api/v1/repositories`           | yes  | List the caller's repositories                             |
| GET    | `/api/v1/repositories/:id`       | yes  | Get one owned repository                                   |
| PATCH  | `/api/v1/repositories/:id`       | yes  | Update an owned repository                                 |
| DELETE | `/api/v1/repositories/:id`       | yes  | Delete an owned repository                                 |
| POST   | `/api/v1/repositories/:id/scans` | yes  | Create a `queued` scan record                              |
| GET    | `/api/v1/repositories/:id/scans` | yes  | List scans for an owned repository                         |
| GET    | `/api/v1/scans/:id`              | yes  | Get one owned scan                                         |

`/health` returns HTTP 200 while the process is up and reports `"status": "degraded"`
with `"database": "disconnected"` when MongoDB is unreachable, so a database outage is
distinguishable from the API being down.

### Response shape

Success:

```json
{ "success": true, "data": {}, "message": "Operation successful" }
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

Errors are produced centrally in `middleware/error-handler.ts`, which maps `ApiError`,
Zod issues, and common Mongoose errors (`ValidationError`, `CastError`, duplicate key) to
status codes. Stack traces are only attached outside production. Invalid payloads return
`422`; malformed ObjectId route params are rejected by validation before reaching a model.

## Data models

- **User** — `name`, unique lowercased `email`, `passwordHash` (excluded from queries by
  default via `select: false`), timestamps. Hashes are never serialized to responses.
- **Repository** — `ownerId` (ref `User`), `name`, `url`, `provider` (`github` | `local`),
  `defaultBranch`, optional `description`, timestamps. Indexed by owner; unique per
  owner + url.
- **Scan** — `repositoryId`, `ownerId`, `branch`, optional `commitHash`, `status`
  (`queued` | `running` | `completed` | `failed`), optional `startedAt`, `completedAt`,
  `error`, timestamps.

Repository and scan queries are always scoped by the authenticated `ownerId`, so one user
cannot read or mutate another user's data; a miss returns `404` rather than leaking
existence.

## Testing

```bash
pnpm --filter @codesense/api test
```

Covers environment validation, request validation schemas, the JWT authentication
middleware, repository ownership enforcement (with mocked models), the health endpoint, and
controller→service delegation. Tests mock the data layer and do not need a live database.

## Notes

- MongoDB connects before the server starts listening; a connection failure exits non-zero.
- `SIGINT`/`SIGTERM` close the HTTP server, disconnect from MongoDB, and exit cleanly.
- Scanning, cloning, AST/dependency analysis, and LLM features are out of scope here; the
  scan module only records and returns scan state.
