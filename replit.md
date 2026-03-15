# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a Domino Gaplek multiplayer web game named **GP (Gaplek Pinus)**.

## Features

- **Profile system**: Avatar picker + nickname stored in localStorage (persistent across sessions)
- **Reconnect**: profileId-based reconnect — player rejoins room mid-game seamlessly
- **Spectator mode**: Late joiners (during playing phase) join as spectators
- **Host controls**: Host can kick players, only host can start game
- **Ping host**: Non-host players can ping the host to request game start
- **Exit room**: Clean exit button with server-side cleanup
- **Board layout**: Tile wrapping (flexWrap) — no horizontal scroll, tiles grid-wrap
- **Floating chat**: Minimizable floating chat overlay during game with unread badge
- **Chat in lobby**: Chat works in both waiting room and during game
- **Lobby ambient sound**: Soft pentatonic arpeggio ambient while in lobby
- **TEPAK sound**: Realistic table-slap sound when placing tiles
- **Round over**: Only "SELESAI" option — game returns to waiting room

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Realtime**: Socket.IO
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (artifacts/gaplek)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server with Socket.IO game backend
│   │   └── src/game/       # Domino game logic (domino.ts, roomManager.ts)
│   └── gaplek/             # React + Vite frontend for Domino Gaplek game
│       └── src/
│           ├── pages/      # LobbyPage, WaitingRoom, GamePage
│           ├── components/ # DominoTile, ChatPanel
│           └── lib/        # socket.ts, sounds.ts, gameTypes.ts
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Game Features

- **Domino Gaplek** multiplayer 2-4 players
- Double-6 set (28 tiles), distributed: 4p→7 each, 3p→9 each (+1 hidden), 2p→14 each
- Round 1: player with 0-0 opens (else 1-1, 2-2, etc.)
- Subsequent rounds: winner opens with a double tile
- PASS when no playable tiles; blocked when all pass
- Realtime via Socket.IO at `/api/socket.io`
- Chat for all users with nicknames
- Pause/Resume/End game functionality
- Sound effects via Web Audio API
- Mobile-first portrait layout

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with Socket.IO. Game logic in `src/game/`.

- Entry: `src/index.ts` — reads `PORT`, starts Express + Socket.IO
- Routes: `src/routes/` 
- Game: `src/game/domino.ts` (pure logic), `src/game/roomManager.ts` (state management)
- Socket.IO path: `/api/socket.io`

### `artifacts/gaplek` (`@workspace/gaplek`)

React + Vite frontend for the game.

- `src/pages/LobbyPage.tsx` — nickname + room code entry
- `src/pages/WaitingRoom.tsx` — lobby waiting room
- `src/pages/GamePage.tsx` — main game board
- `src/components/DominoTile.tsx` — visual domino tile with pips
- `src/components/ChatPanel.tsx` — realtime chat
- `src/lib/socket.ts` — Socket.IO client singleton
- `src/lib/sounds.ts` — Web Audio API sound effects
- `src/lib/gameTypes.ts` — shared TypeScript types
