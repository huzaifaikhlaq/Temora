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

- `src/app/` — App Router routes, route groups, root layout, and global styles.
- `src/components/ui/` — reusable, presentation-focused UI primitives.
- `src/components/shared/` — shared application components.
- `src/components/layouts/` — reusable page and section layouts.
- `src/features/` — feature-owned UI and logic, kept separate by domain.
- `src/hooks/` — shared React hooks.
- `src/lib/` — framework-independent utilities.
- `src/services/` — API clients and backend service communication.
- `src/types/` — shared TypeScript types.
- `src/constants/` — shared constants.
- `src/config/` — application configuration.

The `(auth)`, `(dashboard)`, and `(marketing)` directories are App Router route
groups. Add routes inside them as product areas are implemented; route groups
do not affect URL paths.

## Commands

- `pnpm dev` — start the development server.
- `pnpm lint` — run ESLint.
- `pnpm typecheck` — verify TypeScript types.
- `pnpm build` — create a production build.
- `pnpm start` — serve the production build.

## Configuration

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` when the
backend API origin is available. Only browser-safe values should use the
`NEXT_PUBLIC_` prefix; keep credentials and service secrets server-side. Add
service-specific endpoint configuration when backend contracts are established.

The theme follows the operating system color preference by default. Set
`data-theme="light"` or `data-theme="dark"` on the root element to override it.
