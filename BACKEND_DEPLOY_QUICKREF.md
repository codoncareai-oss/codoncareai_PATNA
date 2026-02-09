# Backend Deployment - Quick Reference

## ⚡ Fastest: Railway (5 minutes)

```bash
cd backend
npm install -g @railway/cli
railway login
railway init
railway up
railway domain
```

Copy URL → Vercel env: `VITE_BACKEND_URL=<url>`

---

## 🔧 Alternative: Render

1. Go to https://render.com
2. New Web Service → Connect GitHub
3. Settings:
   - Root: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - RAM: 2GB minimum
4. Deploy
5. Copy URL → Vercel env: `VITE_BACKEND_URL=<url>`

---

## 🖥️ Alternative: EC2

```bash
# Launch t3.medium Ubuntu instance
ssh ubuntu@your-ip

# Setup
git clone https://github.com/codoncareai-oss/codoncareai_PATNA.git
cd codoncareai_PATNA/backend
pip3 install -r requirements.txt

# Run
uvicorn main:app --host 0.0.0.0 --port 8000
```

Setup nginx + certbot for HTTPS.

---

## ✅ Verify Deployment

```bash
# Health check
curl https://your-backend-url/health

# Expected: {"status":"ok","ocr":"paddleocr"}
```

---

## 🔐 Vercel Environment Variables

Required in Vercel dashboard:

```
VITE_GITHUB_TOKEN=ghp_xxxxx
VITE_BACKEND_URL=https://your-backend.railway.app
```

After setting, redeploy frontend.

---

## 💰 Cost

- **Railway:** Free tier (500 hrs/month) or $5/mo
- **Render:** Free tier or $7/mo
- **EC2:** ~$30/mo (t3.medium)

---

## 🐛 Troubleshooting

### Frontend shows "Backend OCR failed"
- Check `VITE_BACKEND_URL` is set in Vercel
- Verify backend is running: `curl <url>/health`
- Check backend logs

### CORS errors
- Backend already allows all origins
- Clear browser cache

### Memory errors
- PaddleOCR needs 2GB RAM minimum
- Upgrade instance size

---

## 📝 Notes

- Backend has NO environment variables
- Frontend needs `VITE_BACKEND_URL`
- HTTPS required for production
- CORS pre-configured for Vercel
