# zkTalk

Community messenger inspired by Discord + Zulip. See `docs/community-messenger-design.md` for full specification.

## Project Structure

Monorepo managed by Turborepo + pnpm workspaces.

- `apps/web` — Next.js 15 (App Router) + Tailwind CSS 4 + Zustand + TanStack Query
- `apps/api` — Fastify 5 + Drizzle ORM + WebSocket
- `packages/shared` — Zod schemas, TypeScript types, constants (used by both apps)
- `packages/typescript-config` — Shared tsconfig base files
- `packages/eslint-config` — Shared ESLint configurations
- `docker/` — Docker Compose for local dev (PostgreSQL 16, Redis 7, MinIO)
- `e2e/` — Playwright E2E tests

## Commands

```bash
pnpm install              # Install all dependencies
pnpm turbo dev            # Start all apps in dev mode
pnpm turbo build          # Build all packages and apps
pnpm turbo lint           # Lint all packages
pnpm turbo typecheck      # Type-check all packages
pnpm turbo test           # Run all tests

# API specific
cd apps/api
pnpm db:generate          # Generate Drizzle migration
pnpm db:migrate           # Run migrations
pnpm db:studio            # Open Drizzle Studio

# Docker
docker compose -f docker/docker-compose.yml up -d    # Start local services
docker compose -f docker/docker-compose.yml down      # Stop local services
```

## Code Conventions

- **Language**: TypeScript strict mode everywhere
- **Package manager**: pnpm (do not use npm or yarn)
- **IDs**: UUIDv7 for all entity primary keys
- **API style**: REST with Fastify, no GraphQL
- **Validation**: Zod schemas in `packages/shared`, reused on client and server
- **ORM**: Drizzle ORM with explicit SQL migrations in `apps/api/drizzle/`
- **Naming**:
  - camelCase for variables/functions
  - PascalCase for types/interfaces/components
  - snake_case for database columns
  - kebab-case for file names
  - PascalCase for React component files
- **Imports**: Use `@/` path alias in each app
- **Tests**: Co-located in `__tests__/` directories, named `*.test.ts` or `*.test.tsx`
- **Commits**: Conventional Commits format: `<type>(<scope>): <description>`
  - Types: feat, fix, refactor, test, docs, chore, ci
  - Scopes: auth, community, channel, message, thread, moderation, search, realtime, web, api, shared, ci

## API Module Pattern

Each module in `apps/api/src/modules/<name>/` follows:

```
<name>/
  <name>.routes.ts      # Fastify route registrations
  <name>.service.ts     # Business logic
  <name>.repository.ts  # Database queries (Drizzle)
  <name>.schema.ts      # Zod request/response schemas
  __tests__/
    <name>.service.test.ts
    <name>.routes.test.ts
```

## React Component Pattern

```
components/
  <ComponentName>/
    <ComponentName>.tsx
    index.ts
    __tests__/
      <ComponentName>.test.tsx
```

## Agent Instructions

When implementing features:

1. Always check alignment with `docs/community-messenger-design.md`
2. Run `pnpm turbo typecheck` before committing
3. Every API endpoint needs: route, service, repository, Zod schema, at least one test
4. Every React component needs: component file, export barrel
5. Database changes require a Drizzle migration (`pnpm db:generate`)
6. WebSocket events must match the contract in design doc section 11
7. Use `@zktalk/shared` for types and validators — never duplicate

## Implementation Phases

- [x] Phase 0: Project bootstrap
- [x] Phase 1: Auth, Users, Communities, Memberships
- [x] Phase 2: Categories, Channels, Roles, Permissions
- [x] Phase 3: Basic Channel Messaging (REST)
- [x] Phase 4: WebSocket Real-Time Delivery
- [x] Phase 5: Threads and Forum Channels
- [x] Phase 6: Reactions, Attachments, Unread State
- [x] Phase 7: Moderation and Audit Log
- [x] Phase 8: Search and Inbox
