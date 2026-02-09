# Backend Deployment Fix - Complete

## Issue
Frontend was calling `http://localhost:8000/ocr/extract` which fails on Vercel.

## Solution

### 1. Frontend Already Correct ✅
The frontend code already uses environment variables:
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
```

No code changes needed.

### 2. Backend Deployment Files Added ✅

Created deployment configuration:
- `backend/Procfile` - For Railway/Render
- `backend/railway.json` - Railway config
- `backend/runtime.txt` - Python 3.11
- `backend/deploy-railway.sh` - Quick deploy script
- `backend/DEPLOYMENT.md` - Comprehensive guide
- `BACKEND_DEPLOY_QUICKREF.md` - Quick reference

### 3. CORS Already Configured ✅
Backend already allows all origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    ...
)
```

### 4. Environment Variables ✅

**Frontend (Vercel):**
```
VITE_GITHUB_TOKEN=ghp_xxxxx
VITE_BACKEND_URL=https://your-backend.railway.app
```

**Backend:**
No environment variables needed.

## Deployment Steps

### Option 1: Railway (Recommended - 5 minutes)

```bash
cd backend
./deploy-railway.sh
```

This will:
1. Install Railway CLI (if needed)
2. Login to Railway
3. Initialize project
4. Deploy backend
5. Show backend URL

### Option 2: Render

1. Go to https://render.com
2. New Web Service
3. Connect GitHub: `codoncareai-oss/codoncareai_PATNA`
4. Settings:
   - Root: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - RAM: 2GB minimum
5. Deploy

### Option 3: EC2

See `backend/DEPLOYMENT.md` for full EC2 guide.

## After Backend Deployment

1. Copy backend URL (e.g., `https://your-app.railway.app`)
2. Go to Vercel dashboard
3. Project Settings → Environment Variables
4. Add: `VITE_BACKEND_URL=https://your-app.railway.app`
5. Redeploy frontend

## Verification

### Test Backend
```bash
curl https://your-backend-url/health
```

Expected:
```json
{"status":"ok","ocr":"paddleocr"}
```

### Test Full Flow
1. Open frontend on Vercel
2. Upload a lab report
3. Check browser console:
   - Should show backend URL (not localhost)
   - "✅ Backend OCR: X raw rows extracted"

## Files Changed

### Created:
- `backend/Procfile`
- `backend/railway.json`
- `backend/runtime.txt`
- `backend/deploy-railway.sh`
- `backend/DEPLOYMENT.md`
- `BACKEND_DEPLOY_QUICKREF.md`

### Modified:
- `backend/README.md` - Added deployment info
- `.env.example` - Clarified production URLs

## Git Status

**Commit:** 41661dc  
**Branch:** main  
**Status:** ✅ PUSHED

## Next Action Required

**Deploy the backend:**

```bash
cd backend
./deploy-railway.sh
```

Then update Vercel environment variable with the backend URL.

## Cost

- **Railway:** Free tier (500 hrs/month) or $5/mo
- **Render:** Free tier or $7/mo  
- **EC2:** ~$30/mo (t3.medium)

Railway recommended for easiest deployment.

## Summary

✅ Frontend code already uses environment variables (no changes needed)  
✅ Backend CORS already configured  
✅ Deployment files created  
✅ Deployment guides written  
✅ Quick deploy script ready  
✅ All changes committed and pushed  

**Status: READY TO DEPLOY BACKEND**
