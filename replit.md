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
- **Tech**: React + Vite + React Three Fiber + Three.js + Zustand
- **Description**: A 3D endless runner game inspired by Subway Surfers with a custom character, voice reactions, coins, obstacles, and score tracking. Features 3 lanes, jump mechanics, increasing speed, and browser-based speech synthesis for voice feedback.
- **Game controls**: Arrow keys / WASD / swipe to switch lanes and jump

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
