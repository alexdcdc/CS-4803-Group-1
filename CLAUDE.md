# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a monorepo with two projects:
- `frontend/` — Expo SDK 54 React Native app
- `backend/` — Python FastAPI server backed by Supabase

## Commands

### Frontend (run from `frontend/`)
- **Start dev server:** `npx expo start` (or `npm start`)
- **Start for specific platform:** `npm run android`, `npm run ios`, `npm run web`
- **Lint:** `npm run lint` (uses eslint-config-expo flat config)
- **Type check:** `npx tsc --noEmit`

### Backend (run from `backend/`)
- **Start dev server:** `uvicorn app.main:app --reload`
- **Install deps:** `pip install -r requirements.txt`

## Architecture

### Frontend

Expo SDK 54 React Native app using expo-router for file-based routing, with React 19, New Architecture enabled, and the React Compiler experiment turned on.

#### Routing

- `app/_layout.tsx` — Root layout: Stack navigator with ThemeProvider (light/dark) wrapped in `AppProvider` context
- `app/(tabs)/_layout.tsx` — 4-tab navigator: Feed, Discover, Dashboard, Wallet
- Modal screens: `donate`, `recharge`, `create-campaign`, `upload-content`, `add-reward` — all `presentation: 'modal'`
- Detail screens: `project/[id]` (backer view), `campaign/[id]` (creator view)

#### State & Data

- `context/app-context.tsx` — Single React Context holding user state, projects, and action functions (donate, recharge, createCampaign, etc.)
- `services/api-client.ts` — API client that talks to the FastAPI backend. Uses Supabase JS client for auth, attaches Bearer token to all requests.
- `data/types.ts` — TypeScript interfaces: `Project`, `Reward`, `User`, `Transaction`

#### Theming

- `constants/theme.ts` — Exports `Colors` (light/dark palettes) and `Fonts` (platform-specific font stacks)
- `ThemedText` and `ThemedView` are the base themed components; use them instead of raw `Text`/`View`

#### Icons

- `components/ui/icon-symbol.tsx` — Cross-platform icon: native SF Symbols on iOS, MaterialIcons on Android/web. New icons require adding an SF Symbol-to-MaterialIcon entry in the `MAPPING` object.

#### Path Aliases

TypeScript path alias `@/*` maps to the frontend root (e.g., `@/components/themed-text`).

### Backend

FastAPI app with routers under `app/routers/` (auth, users, projects, wallet, feed). Uses Supabase for database and auth.

- `app/main.py` — FastAPI app entry with CORS middleware
- `app/config.py` — Pydantic settings (env vars)
- `app/dependencies.py` — JWT validation, get_current_user dependency
- `app/routers/` — Route handlers
- `app/models/` — Pydantic request/response models
- `app/services/supabase_client.py` — Supabase client factory

### Database (Supabase)

Tables: `profiles`, `projects`, `project_videos`, `rewards`, `transactions`, `donations`, `video_interactions`
- Credit balance is computed from the transactions ledger (not stored)
- Project stats (raised_credits, backer_count) computed from donations table via `project_stats` view
- `isOwned` is derived at API level (project.creator_id == current_user.id)
