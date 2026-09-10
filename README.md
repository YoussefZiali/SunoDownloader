# Suno AI Music Downloader & Player

A modern, high-fidelity web application to stream, preview, customize, and download Suno AI tracks, playlists, and audio stems.

---

## 🚀 Deployment to Vercel (Ready out of the box)

This project is configured for **1-click deployment on Vercel**:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your GitHub repository.
   - Framework Preset: **Vite** (automatically detected).
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Click **Deploy**.

### How Vercel Deployment Works
- The frontend is built into static files in `dist/`.
- All backend routes (`/api/suno/*`) are handled by the serverless function in `api/index.ts` using `vercel.json` rewrites.
- In serverless environments where `ffmpeg` is not installed, the engine gracefully delivers decrypted native audio streams (`.m4a` / `.mp4` AAC) with full HTML5 audio seeking and clean metadata headers.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start development server on http://localhost:3000
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 🐳 Container / VPS Deployment (Optional)

If you host on platforms with long-running Node.js containers (Render, Railway, Fly.io, or VPS) with `ffmpeg` installed:
- Set environment port to `3000`.
- Start script: `npm start` (runs `node dist/server.cjs`).
- The engine will automatically detect system `ffmpeg` and enable server-side 320kbps MP3 ID3v2 tag embedding and loudness normalization.
