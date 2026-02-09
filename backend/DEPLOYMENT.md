# Backend Deployment Guide

## Quick Deploy to Railway (Recommended)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Deploy Backend
```bash
cd backend
railway init
railway up
```

### Step 3: Get Backend URL
```bash
railway domain
```

Copy the URL (e.g., `https://your-app.railway.app`)

### Step 4: Update Frontend Environment
In Vercel dashboard, add environment variable:
```
VITE_BACKEND_URL=https://your-app.railway.app
```

Redeploy frontend.

---

## Alternative: Deploy to Render

### Step 1: Create Web Service
1. Go to https://render.com
2. New → Web Service
3. Connect GitHub: `codoncareai-oss/codoncareai_PATNA`

### Step 2: Configure Service
- **Name:** `codoncareai-backend`
- **Root Directory:** `backend`
- **Environment:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Instance Type:** At least 2GB RAM

### Step 3: Deploy
Click "Create Web Service"

### Step 4: Get URL
Copy the URL from Render dashboard (e.g., `https://codoncareai-backend.onrender.com`)

### Step 5: Update Frontend
In Vercel, set:
```
VITE_BACKEND_URL=https://codoncareai-backend.onrender.com
```

---

## Alternative: Deploy to EC2

### Step 1: Launch EC2 Instance
- AMI: Ubuntu 22.04
- Instance Type: t3.medium (2GB RAM minimum)
- Security Group: Allow ports 22, 80, 443

### Step 2: Install Dependencies
```bash
ssh ubuntu@your-ec2-ip

# Install Python and dependencies
sudo apt update
sudo apt install -y python3-pip nginx certbot python3-certbot-nginx

# Clone repo
git clone https://github.com/codoncareai-oss/codoncareai_PATNA.git
cd codoncareai_PATNA/backend

# Install Python packages
pip3 install -r requirements.txt
```

### Step 3: Run with Systemd
Create `/etc/systemd/system/codoncareai-backend.service`:
```ini
[Unit]
Description=CodonCareAI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/codoncareai_PATNA/backend
ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable codoncareai-backend
sudo systemctl start codoncareai-backend
```

### Step 4: Configure Nginx
Create `/etc/nginx/sites-available/codoncareai-backend`:
```nginx
server {
    listen 80;
    server_name api.codoncare.ai;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/codoncareai-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Setup HTTPS
```bash
sudo certbot --nginx -d api.codoncare.ai
```

### Step 6: Update Frontend
In Vercel:
```
VITE_BACKEND_URL=https://api.codoncare.ai
```

---

## Verify Deployment

### Test Health Endpoint
```bash
curl https://your-backend-url/health
```

Expected:
```json
{"status":"ok","ocr":"paddleocr"}
```

### Test OCR Endpoint
```bash
curl -X POST https://your-backend-url/ocr/extract \
  -F "file=@test_report.pdf"
```

Expected: JSON with rows array

---

## Environment Variables

### Backend
No environment variables needed (PaddleOCR runs locally)

### Frontend (Vercel)
Required:
- `VITE_GITHUB_TOKEN` - GitHub Models API token
- `VITE_BACKEND_URL` - Backend OCR URL (e.g., https://your-app.railway.app)

---

## Troubleshooting

### CORS Errors
Backend already allows all origins. If issues persist, check browser console.

### Backend Not Responding
Check logs:
- Railway: `railway logs`
- Render: View logs in dashboard
- EC2: `sudo journalctl -u codoncareai-backend -f`

### Memory Issues
PaddleOCR requires minimum 2GB RAM. Upgrade instance if needed.

---

## Cost Estimates

### Railway
- Free tier: 500 hours/month
- Pro: $5/month + usage

### Render
- Free tier: Available (with sleep after inactivity)
- Starter: $7/month

### EC2
- t3.medium: ~$30/month
- t3.small: ~$15/month (may be too small for PaddleOCR)

---

## Recommended: Railway

Easiest deployment with good free tier:
```bash
cd backend
railway login
railway init
railway up
railway domain
```

Then update Vercel with the Railway URL.
