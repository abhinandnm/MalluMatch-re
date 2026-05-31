# OpenChat

A fully functional, Omegle-style random video and text chat platform. Built using React, Vite, Node.js, Express, Socket.IO, and WebRTC.

## Features

- **Instant Matchmaking**: Connects strangers via random queue logic across 'Video' and 'Text' chat modes.
- **WebRTC Video**: End-to-end encrypted peer-to-peer video streaming.
- **Socket.io Signaling**: Fast, real-time message exchange and presence updates.
- **Premium Matte Design**: Clean, minimal, modern UI with smooth gradients and glassmorphism.
- **Responsive Layout**: Works seamlessly on both desktop and mobile browsers.

## Requirements

- Node.js (v18+)

## Running Locally

1. **Start Backend Server**:
   ```bash
   cd backend
   npm install 
   npm start
   ```
   The backend will run on `http://localhost:5000`.

2. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`. Open your browser to that port.

## Deployment to Production

### 1. Backend Deployment (AWS EC2)
- Deploy the `backend` folder to an **AWS EC2 instance**.
- This project uses **PM2** for process management and **GitHub Actions** for automated deployment.
- Ensure the server is listening on port `5000` and ports `80`/`443` are open in your AWS Security Group.

### 2. Frontend Deployment (Vercel, Netlify, AWS S3)
- Navigate to the `frontend` folder and run `npm run build`.
- Upload the resulting `dist/` directory to your static edge hosting provider.
- Important: Replace the hardcoded `http://localhost:5000` strings in `src/pages/Home.jsx` and `src/pages/ChatRoom.jsx` with your production backend URL (e.g. `https://api.mallumatch.com`) before building.

### 3. WebRTC NAT Traversal (STUN / TURN)
- By default, the application uses Google's free public STUN servers. This covers about 80% of peer-to-peer connections (NAT punch-through).
- For reliable production usage (especially over strict corporate firewalls or symmetric NATs), you must deploy a TURN server (like Coturn) or use a paid service like Twilio Network Traversal or Metered TURN.
- Add your TURN server credentials to the `iceServers` array in `src/pages/ChatRoom.jsx`.

```javascript
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'password'
    }
  ],
};
```


## Pushing to a Remote Repository

1. Initialize git at the root directory: `git init`
2. Create `.gitignore` file including `node_modules` and `.env`.
3. Stage changes: `git add .`
4. Commit: `git commit -m "Initial commit"`
5. Link your remote repository: `git remote add origin <your-repository-url>`
6. Push code: `git push -u origin main`
























/





   





