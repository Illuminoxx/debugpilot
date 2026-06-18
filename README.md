# DebugAgent — Complete Setup & Deployment Guide


---

## PART 1 — Install Required Software (Do This First)

### Step 1.1 — Install Python 3.11
1. Go to https://www.python.org/downloads/
2. Download Python 3.11.x (NOT 3.12 or 3.13)
3. Run the installer
4. ✅ CHECK "Add Python to PATH" before clicking Install
5. Verify: open terminal, type `python --version` → should show 3.11.x

### Step 1.2 — Install Node.js
1. Go to https://nodejs.org
2. Download LTS version (20.x)
3. Run installer with all defaults
4. Verify: open terminal, type `node --version` → should show v20.x

### Step 1.3 — Install Git
1. Go to https://git-scm.com/download/win
2. Download and install with all defaults
3. Verify: open terminal, type `git --version`

### Step 1.4 — Install VS Code (recommended editor)
1. Go to https://code.visualstudio.com
2. Download and install

---

## PART 2 — Get Your Free Groq API Key

### Step 2.1
1. Go to https://console.groq.com
2. Click "Sign Up" (top right)
3. Create account (Google signup is fastest, no credit card needed)
4. Once logged in, click "API Keys" in the left sidebar
5. Click "Create API Key"
6. Name it "debug-agent"
7. Copy the key — it starts with `gsk_...`
8. Save it somewhere safe — you'll need it in Step 4.2

---

## PART 3 — Set Up The Project

### Step 3.1 — Extract the zip
1. Download debug-agent.zip
2. Extract it to a folder like `C:\Projects\debug-agent`
3. Open that folder in VS Code (File → Open Folder)

### Step 3.2 — Open two terminals
In VS Code: Terminal → New Terminal (open two tabs)
- Terminal 1 = for backend
- Terminal 2 = for frontend

---

## PART 4 — Set Up Backend

### Step 4.1 — Create virtual environment
In Terminal 1:
```
cd backend
python -m venv venv
venv\Scripts\activate
```
You should see `(venv)` at the start of the line now.

### Step 4.2 — Add your Groq API key
Open `backend/.env` in VS Code.
Replace `your_groq_api_key_here` with your actual key:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```
Save the file.

### Step 4.3 — Install dependencies
```
pip install -r requirements.txt
```
This installs: fastapi, uvicorn, langgraph, groq, sqlalchemy, etc.
Wait for it to finish (1-2 minutes).

### Step 4.4 — Run the backend
```
uvicorn app.main:app --reload --port 8000
```
You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```
✅ Backend is running. Leave this terminal open.

### Step 4.5 — Verify backend works
Open browser → go to http://localhost:8000
You should see: `{"status":"ok","service":"Autonomous Debug Agent"}`

---

## PART 5 — Set Up Frontend

### Step 5.1 — Install dependencies
In Terminal 2:
```
cd frontend
npm install
```
Wait for it to finish (1-2 minutes, downloads node_modules).

### Step 5.2 — Run the frontend
```
npm run dev
```
You should see:
```
  VITE v5.x.x ready
  ➜  Local:   http://localhost:5173/
```
✅ Frontend is running.

### Step 5.3 — Open the app
Go to http://localhost:5173 in your browser.
You should see the DebugAgent UI with a code editor.

---

## PART 6 — Test It Works End-to-End

### Step 6.1 — Run a debug session
1. The editor should already have sample Python code
2. The error field should already have the traceback
3. Click "Debug It →"
4. Watch the Fix Trail panel on the right:
   - 🔍 Analyze step appears (root cause + confidence)
   - 🔧 Patch step appears (code diff)
   - ⚡ Execute step appears (passed/failed + output)
   - ✅ "Fixed in X iterations" appears with the working code
5. Click "Copy Fix" to copy the fixed code

If this works, your local setup is 100% complete.

---

## PART 7 — Deploy Backend to Render (Free)

### Step 7.1 — Push backend to GitHub
1. Go to https://github.com → sign in → click "New repository"
2. Name it `debug-agent-backend`
3. Keep it Public
4. Click "Create repository"
5. In Terminal 1 (backend folder), run:
```
cd backend
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/debug-agent-backend.git
git push -u origin main
```

### Step 7.2 — Deploy on Render
1. Go to https://render.com → sign up (free, GitHub login works)
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select `debug-agent-backend` repo
5. Fill in settings:
   - **Name:** debug-agent-backend
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
6. Scroll down to "Environment Variables"
7. Click "Add Environment Variable":
   - Key: `GROQ_API_KEY`
   - Value: your `gsk_...` key
8. Click "Create Web Service"
9. Wait 3-5 minutes for it to build and deploy
10. Copy your Render URL — it looks like:
    `https://debug-agent-backend.onrender.com`
11. Open that URL in browser → should show `{"status":"ok",...}`

---

## PART 8 — Deploy Frontend to Vercel (Free)

### Step 8.1 — Update the production API URL
Open `frontend/.env.production`
Replace `https://YOUR_RENDER_URL.onrender.com` with your actual Render URL:
```
VITE_API_URL=https://debug-agent-backend.onrender.com
```
Save the file.

### Step 8.2 — Push frontend to GitHub
1. Go to https://github.com → click "New repository"
2. Name it `debug-agent-frontend`
3. Keep it Public
4. Click "Create repository"
5. In Terminal 2 (frontend folder), run:
```
cd frontend
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/debug-agent-frontend.git
git push -u origin main
```

### Step 8.3 — Deploy on Vercel
1. Go to https://vercel.com → sign up (GitHub login)
2. Click "Add New..." → "Project"
3. Select `debug-agent-frontend` repo
4. Framework Preset: Vite (auto-detected)
5. Click "Deploy"
6. Wait 1-2 minutes
7. Vercel gives you a URL like `https://debug-agent-frontend.vercel.app`

### Step 8.4 — Verify deployment
Open your Vercel URL → test a debug session → it should work exactly like local.

---

## PART 9 — Final Checklist

- [ ] Python 3.11 installed
- [ ] Node.js 20 installed
- [ ] Git installed
- [ ] Groq API key obtained (free)
- [ ] Backend runs locally on port 8000
- [ ] Frontend runs locally on port 5173
- [ ] Tested debug session works locally
- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel with correct VITE_API_URL
- [ ] Live URL tested and working

---

## TROUBLESHOOTING

**"ModuleNotFoundError" when running uvicorn**
→ Make sure you activated venv: `venv\Scripts\activate`
→ Then reinstall: `pip install -r requirements.txt`

**Frontend shows "Connection failed"**
→ Check backend is running: go to http://localhost:8000
→ Check VITE_API_URL in .env matches backend port

**Groq API error "invalid api key"**
→ Open backend/.env and verify the key starts with `gsk_`
→ Restart uvicorn after saving .env

**Render deploy fails**
→ Check build logs in Render dashboard
→ Most common issue: GROQ_API_KEY env var not set

**"python is not recognized"**
→ Reinstall Python and check "Add to PATH" during install
→ Restart terminal after installing

**SSE stream stops immediately**
→ Render free tier sleeps after inactivity — first request after sleep takes ~30s
→ This is normal on free tier; upgrade to starter ($7/mo) to avoid it

---

## SUPPORTED LANGUAGES

| Language | Requirement |
|----------|------------|
| Python | ✅ Built-in (Python 3.11 you installed) |
| JavaScript | ✅ Node.js you installed |
| Java | ⚠️ Needs JDK — download from https://adoptium.net |
