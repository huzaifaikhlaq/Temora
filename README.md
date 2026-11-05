# Temora

Temora is a Next.js frontend foundation for a project management platform. It
uses the App Router, React Server Components by default, strict TypeScript, and
Tailwind CSS v4.

## Getting started

Use Node.js 20.9 or newer and pnpm 11:

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```text
src/                         Next.js frontend
services/
  identity-service/           Authentication and identity
  workspace-service/          Workspaces and membership
  project-service/             Projects and planning
  issue-service/               Issues and tasks
  notification-service/        Notifications and inbox
  billing-service/             Plans, subscriptions, and billing
gateway/                      API routing to backend services
infra/                        Docker, PostgreSQL, Redis, and message broker
```

The frontend source is organized under `src/app/` (App Router routes),
`src/components/` (shared UI), and `src/features/` (domain-specific UI and
logic). The top-level service, gateway, and infrastructure directories are
reserved for the backend and deployment setup.

The `(auth)`, `(dashboard)`, and `(marketing)` directories are App Router route
groups. Route groups do not affect URL paths.

## Commands

- `pnpm dev` - start the development server.
- `pnpm lint` - run ESLint.
- `pnpm typecheck` - verify TypeScript types.
- `pnpm build` - create a production build.
- `pnpm start` - serve the production build.

## Configuration

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` when the
backend API origin is available. Only browser-safe values should use the
`NEXT_PUBLIC_` prefix; keep credentials and service secrets server-side. Add
service-specific endpoint configuration when backend contracts are established.

The theme follows the operating system color preference by default. Set
`data-theme="light"` or `data-theme="dark"` on the root element to override it.
