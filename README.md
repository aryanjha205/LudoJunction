# LudoJunction - Real-Time Multiplayer PWA & Vercel Ready

An online real-time multiplayer LudoJunction game built as a Progressive Web App (PWA) with Node.js and Neon PostgreSQL support.

## 🚀 Features

- 📱 **Progressive Web App (PWA)**: Full offline support, app install prompt, standalone mobile experience.
- 🎲 **Real-Time Multiplayer**: Room creation, join codes, state synchronization, undo moves, and dice roll animations.
- 🗄️ **Neon PostgreSQL Integration**: Persistent global leaderboard stored directly in Neon Postgres DB.
- ⚡ **Vercel Ready**: Pre-configured `vercel.json` and static export settings for immediate deployment on Vercel.

---

## 📁 Project Structure

```
.
├── api/
│   └── leaderboard.js         # Vercel Serverless API endpoint
├── scripts/
│   ├── generateIcons.mjs      # PWA icon generator script
│   └── testGameCore.mjs       # Unit test suite for game engine
├── src/
│   ├── client/                # Static PWA Frontend
│   │   ├── index.html         # Main HTML with PWA meta tags & SW registration
│   │   ├── manifest.json      # Web App Manifest
│   │   ├── sw.js              # Service Worker for offline pre-caching
│   │   ├── main.js            # Client application entry point
│   │   ├── assets/            # Game graphics, audio & PWA icons
│   │   └── ludo/              # Client game UI and network logic
│   └── server/                # Backend Node.js WebSocket & DB Server
│       ├── server.js          # HTTP & WebSocket Server entry point
│       ├── WebSocketServer.js # Multiplayer rooms & message dispatcher
│       ├── GameCore.js        # Core Ludo game rules engine
│       └── db.js              # Neon PostgreSQL client with fallback
├── vercel.json                # Vercel deployment configuration
├── package.json               # Dependencies and scripts
└── .env                       # Environment variables (DATABASE_URL)
```

---

## 🛠️ Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate PWA Icons (Optional)
```bash
npm run build
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
PORT=8080
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🌐 Deploying to Vercel

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Environment Variable in Vercel project settings:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
4. Deploy! Vercel will host the PWA frontend and serverless API automatically.

> **Note on WebSockets on Vercel**: 
> Vercel hosts static frontend files and serverless HTTP functions. For long-lived WebSocket connections (`ws://`), host the Node backend on platforms like Railway, Render, Fly.io, or Heroku, and configure the client by appending `?ws=wss://your-backend.com` or passing `window.__LUDO_WS_URL__`.

---

## 📲 Installing as a PWA

- **Android (Chrome/Edge)**: Tap the "Add to Home Screen" banner or select "Install App" from the browser menu.
- **iOS (Safari)**: Tap the Share button and select "Add to Home Screen".
- **Desktop (Chrome/Edge)**: Click the install icon in the address bar.
