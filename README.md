# Gravity - Renju Game Service

Gravity is a web-based board game service where users can play Renju (and other games) in real-time. It features a clean, modern UI and is built for scalability on Google Cloud Platform.

## Features
- **Guest Login**: Instant access with auto-generated nicknames and avatars.
- **Lobby System**: See online users, view active rooms, and create new game rooms.
- **Real-time Gameplay**: Powered by Socket.io for instant move updates and game state synchronization.
- **Renju Logic**: Implements standard 15x15 board with basic Renju win conditions (5 in a row).
- **Responsive Design**: Play on desktop or mobile.

## Tech Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS.
- **Backend**: Node.js, Express, Socket.io (Custom Server).
- **Language**: TypeScript.
- **Deployment**: Docker, GCP Cloud Run.

## Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Access the app at `http://localhost:3000`.

## GCP Deployment Instructions

This service is designed to be deployed on **Google Cloud Run** as a stateless container, with Session affinity enabled (optional but recommended for WebSocket stability, though Socket.io handles it).

### 1. Build Docker Image
```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/gravity
```

### 2. Deploy to Cloud Run
```bash
gcloud run deploy gravity-service \
  --image gcr.io/[PROJECT_ID]/gravity \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --session-affinity
```
*Note: `--session-affinity` is recommended for WebSockets.*

## Project Structure
- `app/`: Next.js App Router pages (Login, Lobby, Room).
- `components/`: React components (Board, etc.).
- `lib/`: Shared logic (Game rules, Types, Socket instance).
- `server.ts`: Custom Express server integrating Next.js and Socket.io.
- `Dockerfile`: Production container configuration.

## Pushing to GitHub

1. **Initialize Git (if not already done)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Connect to Remote Repository**
   Create a new repository on GitHub (e.g., `gravity-service`).
   ```bash
   git remote add origin https://github.com/[YOUR_USERNAME]/gravity-service.git
   ```

3. **Push to Main Branch**
   ```bash
   git branch -M main
   git push -u origin main
   ```
