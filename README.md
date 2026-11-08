# CodeSense

Developer-focused code intelligence platform. Connect a repository, queue scans, and
track their status from a single dashboard.

This repository is a **pnpm workspace + Turborepo** monorepo.

## Workspace layout

```
codesense/
├── apps/
│   ├── api/          # @codesense/api     Express + TypeScript REST API
│   └── web/          # @codesense/web     React + Vite single-page app
├── packages/
│   └── shared/       # @codesense/shared  Zod schemas + TypeScript contracts
├── turbo.json        # Task pipeline (build, dev, lint, typecheck, test)
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

`@codesense/shared` is the source for request/response schemas and DTO
types. Both apps import from it so the API contract is defined once.

## Getting started

```bash
pnpm install

# configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# make sure MongoDB is running, then start API + web together
pnpm dev
```

The API listens on `http://localhost:5000` and the web app on `http://localhost:5173`.
`VITE_API_BASE_URL` defaults to `http://localhost:5000/api/v1`, and the API's
`CORS_ORIGIN` defaults to `http://localhost:5173`, so the two work together out of the box.

## Root scripts

| Command          | Description                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `pnpm dev`       | Start all packages in watch mode (API via `tsx watch`, web via Vite) |
| `pnpm build`     | Compile/ bundle every package (`dist/` output)                       |
| `pnpm lint`      | Run ESLint across the workspace                                      |
| `pnpm typecheck` | Typecheck without emitting                                           |
| `pnpm test`      | Run the test suites                                                  |

Individual packages can be targeted with pnpm filters:

```bash
pnpm --filter @codesense/api dev
pnpm --filter @codesense/web build
```

## Documentation

- [apps/api/README.md](./apps/api/README.md) — REST API, database models, authentication
- [apps/web/README.md](./apps/web/README.md) — web client, routing, theming
