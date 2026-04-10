# Quickstarter

A crowdfunding platform built with an Expo React Native frontend and a FastAPI backend, backed by Supabase.

## Project Structure

```
quickstarter/
  frontend/   — Expo SDK 54 React Native app (iOS, Android, Web)
  backend/    — Python FastAPI server
```

## Prerequisites

- **Node.js** (v18+) and npm
- **Python** 3.11+
- A **Supabase** project (for database and auth)

## Environment Setup

### Backend

Create `backend/.env` with:

```env
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

### Frontend

The Supabase URL, anon key, and API base URL are configured in `frontend/services/config.ts`. Update these values to point to your own Supabase project and backend URL.

## Running the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate # or windows equivalent
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API server starts at `http://localhost:8000`. Interactive docs are available at `http://localhost:8000/docs`.

## Running the Frontend

```bash
cd frontend
npm install
npx expo start
```

From there you can open the app on:

- **Android** — press `a` (requires Android emulator or device with Expo Go)
- **iOS** — press `i` (requires iOS simulator on macOS or device with Expo Go)
- **Web** — press `w`

Or run directly for a specific platform:

```bash
npm run android
npm run ios
npm run web
```

## Linting & Type Checking

```bash
cd frontend
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript type check
```
