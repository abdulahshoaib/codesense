# @codesense/web

Single-page web client for CodeSense: authentication, a repository and scan dashboard, and
settings. Built with React, Vite, and Tailwind CSS v4.

## Stack

| Concern       | Choice                                              |
| ------------- | --------------------------------------------------- |
| UI            | React 19                                            |
| Build         | Vite (dev server + bundler)                         |
| Routing       | React Router (data router, lazy routes)             |
| Data fetching | TanStack Query                                      |
| HTTP          | Axios (typed client with auth + error interceptors) |
| Global state  | Zustand                                             |
| Forms         | React Hook Form + Zod resolvers                     |
| Styling       | Tailwind CSS v4 (`@tailwindcss/vite`)               |
| Icons         | lucide-react                                        |

## Structure

```
src/
├── app/            router, providers, 404 page
├── components/
│   ├── layout/     AppLayout, Sidebar, TopBar, Brand, PageHeader
│   ├── navigation/ breadcrumbs, nav config, route guards/meta, theme toggle, user menu
│   ├── ui/         button, input, card, dialog, dropdown, tabs, badge, alert, ...
│   └── feedback/   error state, empty/table skeletons, scan status badge
├── features/       auth · dashboard · repositories · scans · settings
├── lib/            api-client, query client/keys, token storage, formatters
├── stores/         auth, theme, ui (Zustand)
└── styles/         index.css (Tailwind entry + design tokens)
```

Each feature groups its own `pages/`, `components/`, `hooks/`, `schemas/`, and `services/`.
Server state lives in TanStack Query; only auth session, theme, and UI chrome live in
Zustand stores. Shared request/response types come from `@codesense/shared`. The `@` alias
points at `src/`.

## Environment

Copy `.env.example` to `.env`.

| Variable            | Default                        | Notes                |
| ------------------- | ------------------------------ | -------------------- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | Base URL for the API |

## Scripts

| Command                                   | Description                               |
| ----------------------------------------- | ----------------------------------------- |
| `pnpm --filter @codesense/web dev`        | Vite dev server on port `5173`            |
| `pnpm --filter @codesense/web build`      | Typecheck, then bundle to `dist/`         |
| `pnpm --filter @codesense/web preview`    | Serve the production build on port `4173` |
| `pnpm --filter @codesense/web lint`       | ESLint                                    |
| `pnpm --filter @codesense/web typecheck`  | `tsc --noEmit`                            |
| `pnpm --filter @codesense/web test`       | Vitest (run once)                         |
| `pnpm --filter @codesense/web test:watch` | Vitest in watch mode                      |

## Routes

| Path                    | Access      | Page                                         |
| ----------------------- | ----------- | -------------------------------------------- |
| `/`                     | —           | Redirects to `/dashboard`                    |
| `/login`                | public only | Sign in                                      |
| `/register`             | public only | Create an account                            |
| `/dashboard`            | protected   | Summary cards, recent repositories and scans |
| `/repositories`         | protected   | Repository list                              |
| `/repositories/connect` | protected   | Add a repository                             |
| `/repositories/:id`     | protected   | Repository detail                            |
| `/scans`                | protected   | Scan list                                    |
| `/scans/:id`            | protected   | Scan detail                                  |
| `/settings`             | protected   | Profile, account, appearance                 |
| `*`                     | —           | Not found                                    |

`ProtectedRoute` and `PublicOnlyRoute` guard the two route groups; protected pages render
inside `AppLayout` (sidebar + top bar). Pages are lazy-loaded, and the JWT is attached by an
Axios request interceptor. A `401` from a non-auth endpoint clears the token and emits a
`codesense:unauthorized` event to sign the user out.
