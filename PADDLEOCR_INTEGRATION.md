# PaddleOCR Backend Integration

## Architecture

```
Frontend (React/Vite)
    ↓
Backend (FastAPI + PaddleOCR)
    ↓
Raw Rows
    ↓
LLM Normalizer (Frontend)
    ↓
Normalized Rows
```

## Key Principle

**LLM is NEVER used for extraction.**
**LLM is ONLY used for normalization.**

PaddleOCR extracts raw rows → LLM normalizes them.

## Backend Setup

### Local Development

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs on http://localhost:8000

### Production Deployment

#### Option 1: Railway

```bash
cd backend
railway init
railway up
```

Set environment variable in Railway dashboard:
- `PORT` (auto-set by Railway)

#### Option 2: Render

1. Create new Web Service
2. Connect GitHub repo
3. Set:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `backend`

#### Option 3: Fly.io

```bash
cd backend
fly launch
fly deploy
```

## Frontend Setup

### Environment Variables

Create `.env` file:

```bash
VITE_GITHUB_TOKEN=your_github_token
VITE_BACKEND_URL=http://localhost:8000
```

For production:
```bash
VITE_BACKEND_URL=https://your-backend.railway.app
```

### Deploy to Vercel

```bash
vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_GITHUB_TOKEN`
- `VITE_BACKEND_URL`

## Testing

### 1. Test Backend

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok","ocr":"paddleocr"}`

### 2. Test OCR Extraction

```bash
curl -X POST http://localhost:8000/ocr/extract \
  -F "file=@test_report.pdf"
```

Expected:
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

### 3. Test Full Pipeline

1. Start backend: `python backend/main.py`
2. Start frontend: `npm run dev`
3. Upload a lab report
4. Check console logs:
   - "✅ Backend OCR: X raw rows extracted"
   - "✅ Phase 1 complete: X raw rows"
   - "✅ Phase 2 complete: X normalized rows"
   - "✅ ROW COUNT VERIFIED: X in = X out"

## Success Criteria

✅ PaddleOCR extracts raw rows (no LLM)
✅ Row count preserved (Phase 1 → Phase 2)
✅ No missing lab entries
✅ No fake dates
✅ No hallucinated values
✅ System behaves deterministically

## Troubleshooting

### Backend not reachable

Check CORS settings in `backend/main.py`:
```python
allow_origins=["*"]  # Or specific frontend URL
```

### PaddleOCR installation issues

For CPU-only:
```bash
pip install paddlepaddle
```

For GPU:
```bash
pip install paddlepaddle-gpu
```

### Memory issues

PaddleOCR requires ~2GB RAM. Use at least 2GB instance.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│                   (React + Vite)                        │
│                                                         │
│  1. User uploads PDF/Image                             │
│  2. Call backend OCR                                   │
│  3. Receive raw rows                                   │
│  4. Call LLM normalizer                                │
│  5. Display results                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                      BACKEND                            │
│                (FastAPI + PaddleOCR)                    │
│                                                         │
│  POST /ocr/extract                                     │
│  - Accept PDF/Image                                    │
│  - Run PaddleOCR                                       │
│  - Return raw rows                                     │
│                                                         │
│  STRICT: One line = one row                            │
│  NO merging, NO deletion, NO inference                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   RAW ROWS                              │
│                                                         │
│  [                                                      │
│    { row_id: 1, raw_text: "...", page: 1 },           │
│    { row_id: 2, raw_text: "...", page: 1 },           │
│    ...                                                  │
│  ]                                                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 LLM NORMALIZER                          │
│              (GitHub Models Phi-4)                      │
│                                                         │
│  STRICT: Input count = Output count                    │
│  - Standardize test names                              │
│  - Parse dates                                         │
│  - Extract values                                      │
│  - Return null for unclear data                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│               NORMALIZED ROWS                           │
│                                                         │
│  [                                                      │
│    { row_id: 1, test_key: "creatinine", ... },        │
│    { row_id: 2, test_key: null, ... },                │
│    ...                                                  │
│  ]                                                      │
└─────────────────────────────────────────────────────────┘
```

## Data Flow Example

### Input: Lab Report PDF

```
Serum Creatinine    1.2 mg/dL    2025-01-15
Blood Urea          45 mg/dL     2025-01-15
Hemoglobin          12.5 g/dL    2025-01-15
```

### Phase 1: PaddleOCR (Backend)

```json
{
  "rows": [
    { "row_id": 1, "raw_text": "Serum Creatinine    1.2 mg/dL    2025-01-15", "page": 1, "confidence": 0.95 },
    { "row_id": 2, "raw_text": "Blood Urea          45 mg/dL     2025-01-15", "page": 1, "confidence": 0.93 },
    { "row_id": 3, "raw_text": "Hemoglobin          12.5 g/dL    2025-01-15", "page": 1, "confidence": 0.96 }
  ]
}
```

### Phase 2: LLM Normalizer (Frontend)

```json
[
  { "row_id": 1, "test_key": "creatinine", "value": 1.2, "unit": "mg/dL", "date_iso": "2025-01-15", "date_status": "valid" },
  { "row_id": 2, "test_key": "urea", "value": 45, "unit": "mg/dL", "date_iso": "2025-01-15", "date_status": "valid" },
  { "row_id": 3, "test_key": "hemoglobin", "value": 12.5, "unit": "g/dL", "date_iso": "2025-01-15", "date_status": "valid" }
]
```

**Row count: 3 → 3 → 3 ✅**
