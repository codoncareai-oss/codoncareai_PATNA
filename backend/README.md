# CodonCareAI Backend

PaddleOCR-powered backend for raw row extraction.

## Setup

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

## Deployment

Set environment variable:
```bash
export BACKEND_URL=https://your-backend.com
```

Deploy to Railway/Render/Fly.io with:
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```
