# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (from repo root)
pnpm install

# Run web frontend (dev, port 3000)
pnpm dev
# or
pnpm --filter @quickdraw/web dev

# Run socket.io server (dev, port 3001, auto-restarts on change)
pnpm --filter @quickdraw/server dev

# Build web
pnpm build

# Lint web
pnpm --filter @quickdraw/web lint

# Typecheck game-core
pnpm --filter @quickdraw/game-core typecheck

# Build server
pnpm --filter @quickdraw/server build
```

The web frontend connects to the server via `NEXT_PUBLIC_SERVER_URL` (defaults to `http://localhost:3001`).

## Architecture

This is a pnpm monorepo with three packages:

```
apps/web        — Next.js 16 frontend (React 19, Tailwind 4, shadcn)
apps/server     — Standalone Node.js Socket.IO server (port 3001)
packages/game-core — Shared pure TypeScript types and utilities (no React, no browser APIs)
```

### Game-Core Package (`packages/game-core`)

Zero framework dependencies — imported by both apps/web and apps/server. Contains:

- `types.ts` — `Phase`, `Player`, `Target`, `Shot`, `RoundRecord`, `GameState`, `GameActions`, `HolsterStyle`, `TimingMode`
- `utils.ts` — `computeDamage`, `damageBand`, `isHit`, `hitInViewBox`, `rollBotShot`, `rollArmingDelay`, `makeRoomCode`, `pickP1Name`, `pickP2Name`

**Invariant:** `packages/game-core/src/` must never import from `react`, `next`, or any browser global (`window`, `document`, `performance`, `navigator`).

### Game Phases (state machine)

```
landing → invite → lobby → holster → arming → drawing → result → (holster | gameover)
```

### Two Game Modes

Both implement the same `{ state: GameState; actions: GameActions }` interface, so `page.tsx` needs no type guards:

**`useBotGame`** (`apps/web/lib/quickdraw/use-bot-game.ts`) — Fully client-side, offline-capable. `rollArmingDelay` and `rollBotShot` run in the browser. No socket connection is opened.

**`useMultiplayerGame`** (`apps/web/lib/quickdraw/use-multiplayer-game.ts`) — Socket.IO-backed, server-authoritative. The server owns all phase transitions and shot arbitration. The client emits shots and responds to server events.

`page.tsx` selects the hook based on `?bot=1` query param or local state.

### Server Architecture (`apps/server`)

- `RoomManager` — In-memory `Map<roomCode, RoomState>`. Rooms are ephemeral; no database. Max 2 players per room; extras join as spectators.
- `GameLoop` — Registers socket event handlers. Handles: `ready-up`, `unready`, `arm-holster`, `leave-holster`, `client-shot`, `request-next-round`, `rematch`, `time-sync`.

**Key invariant:** `rollArmingDelay` is called once per round on the server and broadcast via `target-spawn { armingDelayMs, serverSpawnAt }` to both clients. Shot winner is determined by comparing `reactionMs` from both clients. The client with lower `reactionMs` wins when both hit.

### Socket Event Contract

Full typed interface lives in `apps/web/lib/quickdraw/socket-client.ts` (`ServerToClientEvents`, `ClientToServerEvents`).

Key events:

- Client→Server: `join-room`, `arm-holster`, `leave-holster`, `client-shot`, `ready-up`, `unready`, `request-next-round`, `rematch`, `time-sync`
- Server→Client: `joined`, `player-joined`, `player-left`, `lobby-ready`, `game-start`, `target-spawn`, `round-result`, `next-round`, `false-start`, `player-holstered`, `player-ready`, `player-unready`, `spectator-count`, `game-snapshot`, `join-error`

Clock synchronization: `socket-client.ts` runs a 3-sample NTP-style sync on connect and stores the offset in `clockOffsetMs`. Used in `use-multiplayer-game.ts` to schedule target spawn at the correct local time (`serverSpawnAt - (Date.now() + clockOffsetMs)`).

### Frontend Structure (`apps/web`)

- `app/page.tsx` — Root. Selects bot vs multiplayer mode, detects hover capability, reads `?join=CODE` param for auto-join.
- `components/screens/` — Full-screen views per phase: `landing`, `invite`, `lobby`, `game`, `game-over`.
- `components/quickdraw/` — Game-specific sub-components: `app-bar`, `app-foot`, `holster`, `hp-hud`, `target-svg`, `result-overlay`, `qr-placeholder`.
- `components/ui/` — shadcn primitives (`button`, `card`, `sonner`) extended with `qd-*` variants.
- `lib/quickdraw/` — `use-bot-game`, `use-multiplayer-game`, `socket-client`, `use-preferences`.

### Design System

`qd-*` CSS custom properties (defined in `globals.css`) are the single source of truth for the visual design. shadcn `Button` is extended with `qd-primary`, `qd-secondary`, and `qd-ghost` variants; `Card` has a `qd-card` data-variant. Never duplicate these token values.

`HpHud`, `Holster`, and `TargetSvg` are custom components — do not migrate them to shadcn primitives.

The game stage div uses `data-qd-stage` attribute for geometry calculations (target placement, shot delta computation). Any code computing target or shot coordinates must query `document.querySelector('[data-qd-stage]')`.

### Preferences

`usePreferences` persists to localStorage under keys `qd:playerName` and `qd:holsterStyle`. All reads are SSR-guarded with `typeof window === 'undefined'`.
