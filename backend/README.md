# CodonCareAI Backend

PaddleOCR-powered backend for raw row extraction.

## Quick Deploy (Railway)

```bash
cd backend
./deploy-railway.sh
```

Copy the URL and set `VITE_BACKEND_URL` in Vercel.

## Local Development

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server runs on http://localhost:8000

## Endpoints

### POST /ocr/extract
Extract raw rows from PDF or image.

**Input:** Multipart file upload  
**Output:**
```json
{
  "rows": [
    {
      "row_id": 1,
      "raw_text": "Serum Creatinine 1.2 mg/dL",
      "page": 1,
      "confidence": 0.95
    }
  ]
}
```

### GET /health
Health check endpoint.

**Output:**
```json
{"status": "ok", "ocr": "paddleocr"}
```

## Deployment Options

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guides:
- Railway (recommended)
- Render
- EC2

## Requirements

- Python 3.11+
- 2GB RAM minimum (for PaddleOCR)
- HTTPS endpoint for production

## CORS

Backend allows all origins by default. Safe for Vercel deployment.
