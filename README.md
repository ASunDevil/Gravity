# Gravity - Online Board Game Service

Gravity is a modern, real-time web board game service built with Next.js and Node.js. It features a sleek, responsive UI, robust game logic, and AI integration for single-player practice.

## Features

### 🎮 Game Modes
- **Renju (Gomoku)**: Classic 15x15 five-in-a-row game with standard rules.
- **Chess**: Full chess implementation using `chess.js` logic.
- **Go (Baduk)**: 19x19 board with capture mechanics, Ko rule, and suicide prevention.

### 🤖 AI Integration
- **Practice vs AI**: Play against "Gravity Bot" in all supported games.
- **Powered by Google Gemini**: The AI opponent uses the Gemini API for intelligent move generation (requires API key).

### ⚡ Real-Time Experience
- **Instant Updates**: Socket.io ensures low-latency move transmission.
- **Live Lobby**: See active rooms, online player count, and updates in real-time.
- **Player States**: "Ready", "Thinking", and "Waiting" states with live timers.

### 🛠 Gameplay Features
- **Side Selection**: Choose to play as Black, White, or Random.
    - **Renju/Go**: Black plays first.
    - **Chess**: White plays first.
- **Game History**: View the full list of moves with thinking time duration (e.g., "12.5s").
- **Themes**: Switch between Light, Dark, and Neon themes.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS.
- **Backend**: Custom Node.js server with Express & Socket.io.
- **Language**: TypeScript throughout.
- **AI**: Google Gemini API via `@google/generative-ai`.
- **Deployment**: Docker-ready for Google Cloud Run (stateless with session affinity).

## Local Development

### Prerequisites
- Node.js 18+
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
PORT=3000
```
*(Note: AI features will only work if a valid `GEMINI_API_KEY` is provided)*

### 3. Run Development Server
```bash
npm run dev
```
Access the app at `http://localhost:3000`.

### Troubleshooting
If the port is occupied:
```bash
lsof -t -i:3000 | xargs kill -9
```

## Deployment (GCP Cloud Run)

This service is optimized for Cloud Run with session affinity enabled for WebSocket support.

### 1. Build Docker Image
```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/gravity
```

### 2. Deploy
```bash
gcloud run deploy gravity-service \
  --image gcr.io/[PROJECT_ID]/gravity \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --session-affinity
```

## Project Structure
- `app/`: Next.js App Router pages (Lobby, Game Room).
- `components/`: Reusable UI components (Board, ThinkingTimer, etc.).
- `lib/`:
    - `game/`: Core game logic (Renju, Chess, Go).
    - `ai/`: Gemini API integration and prompts.
- `server.ts`: combined Express + Socket.io + Next.js server entry point.
