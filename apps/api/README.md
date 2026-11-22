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
│   ├── mcp-tokens/   personal access tokens for the MCP server
│   ├── repositories/ model · service · controller · routes · schema · types
│   └── scans/        model · service · controller · routes · schema · types
├── mcp/          Streamable HTTP MCP server, tools, clone cache
├── routes/       index.ts (versioned router), health.routes.ts
├── services/     token.service.ts (JWT signing/verification)
├── utils/        ApiError, async-handler, response, zod-error
├── app.ts        Express app factory (no database side effects)
├── mcp-stdio.ts  optional stdio MCP entry
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
| `GITHUB_CLIENT_ID`    | no   | GitHub OAuth app client id (required to connect/scan GitHub repos) |
| `GITHUB_CLIENT_SECRET`| no   | GitHub OAuth app client secret                                    |
| `GITHUB_REDIRECT_URI` | no   | Default `http://localhost:5000/api/v1/auth/github/callback`       |
| `GITHUB_API_URL`      | no   | Default `https://api.github.com`                                  |
| `WEB_APP_URL`         | no   | Default `http://localhost:5173`                                   |
| `AI_API_KEY`          | no   | OpenAI-compatible API key; omit to skip the AI codebase summary   |
| `AI_BASE_URL`         | no   | Default `https://api.openai.com/v1`                               |
| `AI_MODEL`            | no   | Default `gpt-4o-mini`                                             |
| `MCP_PUBLIC_URL`      | no   | Public MCP endpoint advertised in Settings. Default `http://localhost:${PORT}/mcp` |

## Scripts

| Command                                  | Description                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `pnpm --filter @codesense/api dev`       | `tsx watch src/server.ts`                       |
| `pnpm --filter @codesense/api build`     | Compile TypeScript to `dist/`                   |
| `pnpm --filter @codesense/api start`     | Run the compiled server (`node dist/server.js`) |
| `pnpm --filter @codesense/api lint`      | ESLint                                          |
| `pnpm --filter @codesense/api typecheck` | `tsc --noEmit` (includes tests)                 |
| `pnpm --filter @codesense/api test`      | Vitest                                          |
| `pnpm --filter @codesense/api mcp:stdio` | Stdio MCP server (`CODESENSE_MCP_TOKEN` required) |

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
| PATCH  | `/api/v1/users/me`               | yes  | Update user profile                                        |
| POST   | `/api/v1/repositories`           | yes  | Register a repository                                      |
| GET    | `/api/v1/repositories`           | yes  | List the caller's repositories                             |
| GET    | `/api/v1/repositories/:id`       | yes  | Get one owned repository                                   |
| PATCH  | `/api/v1/repositories/:id`       | yes  | Update an owned repository                                 |
| DELETE | `/api/v1/repositories/:id`       | yes  | Delete an owned repository                                 |
| POST   | `/api/v1/repositories/:id/scans` | yes  | Queue a scan for the branch's latest commit                |
| GET    | `/api/v1/repositories/:id/scans` | yes  | List scans for an owned repository                         |
| GET    | `/api/v1/scans/:id`              | yes  | Get one owned scan                                         |
| GET    | `/api/v1/users/me/mcp`           | yes  | MCP endpoint, token list, and example client configs       |
| POST   | `/api/v1/users/me/mcp/tokens`    | yes  | Create a personal MCP token (plaintext returned once)      |
| DELETE | `/api/v1/users/me/mcp/tokens/:id`| yes  | Revoke an owned MCP token                                  |
| ALL    | `/mcp`                           | MCP token | Streamable HTTP MCP server                              |

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
- **Scan** — `repositoryId`, `ownerId`, `branch`, `status`
  (`queued` | `running` | `completed` | `failed`), and once executed: resolved
  `commitHash`, `committedAt`, a static `summary` (file count, lines of code, language
  breakdown, and detected dependencies), an optional `aiSummary`, plus `startedAt`,
  `completedAt`, and `error`.
- **McpToken** — `userId` (ref `User`), `name`, `tokenHash` (sha256, `select: false`),
  `prefix` for display, optional `lastUsedAt`, timestamps. Only the hash is stored;
  the plaintext token is returned once on create.

Repository and scan queries are always scoped by the authenticated `ownerId`, so one user
cannot read or mutate another user's data; a miss returns `404` rather than leaking
existence.

## MCP server

The API hosts a Model Context Protocol server on Streamable HTTP at **`/mcp`**, using
`@modelcontextprotocol/sdk`. It deploys with the API process. Every request must send
a personal MCP token:

```
Authorization: Bearer cs_<token>
```

Create and revoke tokens in the web app under **Settings → MCP access**, or via
`/api/v1/users/me/mcp/tokens`. Tokens are scoped to the owning user. GitHub OAuth
tokens, password hashes, and other secrets are never returned.

Set `MCP_PUBLIC_URL` to the URL clients should use (for example
`https://api.example.com/mcp`). When unset, Settings advertises
`http://localhost:${PORT}/mcp`.

Optional local stdio transport for process-spawned clients:

```bash
CODESENSE_MCP_TOKEN=cs_... pnpm --filter @codesense/api mcp:stdio
```

### Tools

All tools return compact JSON text. File answers include the `commitHash` they
reflect. Outputs are truncated rather than dumped unbounded.

| Tool | Inputs | Output | Limits |
| ---- | ------ | ------ | ------ |
| `list_repositories` | none | Owned repos with latest scan status/commit | — |
| `get_repository_overview` | `repositoryId`, optional `branch`, `commit` | Languages, LOC, dependencies, AI summary, default branch, last scanned commit, staleness vs branch head | 40 dependencies, 4k AI summary |
| `get_file_tree` | `repositoryId`, optional `branch`, `commit` | File/directory entries at that commit | 400 entries, depth 8; skips `node_modules`, `dist`, lockfiles, binaries |
| `read_file` | `repositoryId`, `path`, optional `branch`, `commit` | File text | 100 KB; path traversal rejected |
| `search_code` | `repositoryId`, `query`, optional `isRegex`, `maxMatches`, `branch`, `commit` | Matches with file, line, snippet | 50 matches, 40 files, 200 KB per file |
| `list_branches` | `repositoryId` | Branch names and tip SHAs | — |
| `list_commits` | `repositoryId`, optional `branch`, `limit` | Recent commits | 20 |
| `list_scans` | `repositoryId`, optional `limit` | Recent scans | 25 |
| `get_scan` | `scanId` | One owned scan | 40 dependencies, 4k AI summary |
| `trigger_scan` | `repositoryId`, optional `branch` | Queued scan (same in-process pipeline as the web app) | — |
| `get_project_info` | `repositoryId`, optional `branch`, `commit` | Package manager, scripts, entry points, frameworks, config files, README excerpt | 4k README |

File tools clone the requested commit into a tmp cache (`$TMPDIR/codesense-mcp`,
TTL 30 minutes, max 16 checkouts). Overview/scan tools read stored scan documents
and compare against the current branch tip.

### Client config

Cursor `mcp.json` (HTTP):

```json
{
  "mcpServers": {
    "codesense": {
      "url": "http://localhost:5000/mcp",
      "headers": {
        "Authorization": "Bearer cs_<token>"
      }
    }
  }
}
```

Claude Desktop (HTTP, same shape):

```json
{
  "mcpServers": {
    "codesense": {
      "url": "http://localhost:5000/mcp",
      "headers": {
        "Authorization": "Bearer cs_<token>"
      }
    }
  }
}
```

Claude Desktop or other stdio clients:

```json
{
  "mcpServers": {
    "codesense": {
      "command": "pnpm",
      "args": ["--filter", "@codesense/api", "mcp:stdio"],
      "env": {
        "CODESENSE_MCP_TOKEN": "cs_<token>"
      }
    }
  }
}
```

Settings generates these configs with the real token immediately after creation.

## Testing

```bash
pnpm --filter @codesense/api test
```

Covers environment validation, request validation schemas, the JWT authentication
middleware, repository ownership enforcement (with mocked models), the health endpoint,
controller→service delegation, MCP token hashing/auth, tool handlers, and an MCP client
talking to the HTTP `/mcp` endpoint. Tests mock the data layer and do not need a live
database or outbound GitHub/network calls.

## Notes

- MongoDB connects before the server starts listening; a connection failure exits non-zero.
- `SIGINT`/`SIGTERM` close the HTTP server, disconnect from MongoDB, and exit cleanly.
- Scans run asynchronously in-process after creation: the API resolves the branch's latest
  commit, does a shallow clone, computes static + dependency analysis, and optionally asks
  an OpenAI-compatible model for a codebase summary. Scans left `running` across a process
  restart are not auto-recovered.
