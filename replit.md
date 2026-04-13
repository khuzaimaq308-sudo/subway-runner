# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### 3d-game (Subway Runner)
- **Path**: `artifacts/3d-game/`
- **Preview**: `/` (root)
- **Tech**: React + Vite + React Three Fiber + Three.js + Zustand + Clerk Auth
- **Description**: A 3D endless runner game inspired by Subway Surfers with Clerk Google OAuth auth, custom character, voice reactions, coins, obstacles, ramp trains, jetpack/magnet powerups, police chaser, and score tracking. Features 3 lanes, jump mechanics, increasing speed, and browser-based speech synthesis for voice feedback.
- **Game controls**: Arrow keys / WASD / swipe to switch lanes and jump
- **Big golden watch**: Spawns every 2–2.5 minutes (randomised), triggers dance + hip-hop music
- **Admin panel**: `/admin` route — only accessible to `khuzaimaq308@gmail.com`
- **Leaderboard**: Real-time panel on home screen, polls `/api/leaderboard` every 8s; tracks total watches collected across all games; monthly prize event (₨10K/5K/2K)
- **Score submission**: After each game, watch count + score + coins are submitted to `/api/leaderboard/score` (upserts cumulative totals)

### api-server (API Server)
- **Path**: `artifacts/api-server/`
- **Preview**: `/api`
- **Tech**: Express 5 + Drizzle ORM + Clerk middleware
- **Routes**: `GET /api/leaderboard`, `POST /api/leaderboard/score`, `GET /api/admin/users`

### Database
- **Table**: `leaderboard` — stores per-user cumulative watch, score, coin, and game counts
- **Schema**: `lib/db/src/schema/leaderboard.ts`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
