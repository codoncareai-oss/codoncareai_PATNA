# Quick Start Guide - CodonCareAI with LLM Integration

## Prerequisites
- Node.js 20+ installed
- GitHub Models token (VITE_GITHUB_TOKEN)

## Setup

### 1. Clone Repository
```bash
git clone https://github.com/codoncareai-oss/codoncareai_PATNA.git
cd codoncareai_PATNA
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your token
nano .env
```

Add your token:
```
VITE_GITHUB_TOKEN=your_github_models_token_here
```

### 4. Verify LLM Integration
```bash
./test-llm.sh
```

Expected output:
```
✅ Token found in .env
✅ API call successful!
✅ LLM is responding correctly!
🎉 ALL TESTS PASSED
```

## Running the Application

### Development Mode
```bash
npm run dev
```

Then open: http://localhost:5173

### Production Build
```bash
npm run build
npm run preview
```

## Using the Application

1. **Upload Page** (`/upload`)
   - Enter birth year
   - Select gender
   - Upload medical reports (PDF/Image/CSV)
   - Click "Analyze Report"
   - Watch console for LLM logs

2. **Results Page** (`/results`)
   - View LLM badge (purple gradient)
   - See eGFR trends
   - Check CKD stage
   - Expand debug panel for extraction stats

## Verifying LLM is Working

### Console Logs
Open browser DevTools (F12) and look for:
```
🤖 LLM PRIMARY REFINER STARTED
📍 Endpoint: https://models.inference.ai.azure.com/chat/completions
🤖 Model: Phi-4-multimodal-instruct
⏳ Calling GitHub Models API...
✅ Response received - Status: 200
✅ LLM REFINER SUCCESS
📊 Measurements extracted: X
```

### UI Indicators
- **Header Badge**: Purple gradient badge showing "AI-Powered Extraction"
- **Status Message**: "🤖 AI-assisted document understanding used"
- **Debug Panel**: Shows "LLM Status: ✅ ACTIVE"

## Troubleshooting

### LLM Not Working
1. Check `.env` file exists and contains token
2. Run `./test-llm.sh` to verify API connectivity
3. Check browser console for error messages
4. Verify token has not expired

### Build Fails
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Upload Fails
- Ensure file is PDF, PNG, JPG, or CSV
- Check file size (< 10MB recommended)
- Verify file contains medical data

## Architecture

```
┌─────────────────┐
│  User uploads   │
│   medical file  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract text    │
│ (PDF/OCR/CSV)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deterministic   │
│ extraction      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM PRIMARY     │◄── GitHub Models Phi-4
│ REFINER         │    (ALWAYS RUNS)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Merge & display │
│ with LLM badge  │
└─────────────────┘
```

## Key Files

- `src/utils/llmPrimaryRefiner.js` - LLM integration
- `src/components/LLMBadge.jsx` - UI badge
- `src/pages/Upload.jsx` - Upload & processing
- `src/pages/Results.jsx` - Results display
- `.env` - Environment variables (not in git)
- `test-llm.sh` - API verification script

## Environment Variables

```bash
# Required
VITE_GITHUB_TOKEN=github_pat_xxxxx...

# Optional (for development)
VITE_API_ENDPOINT=https://models.inference.ai.azure.com/chat/completions
VITE_MODEL_NAME=Phi-4-multimodal-instruct
```

## Testing

### Manual Test
1. Start dev server: `npm run dev`
2. Upload sample report: `sample-report.csv`
3. Check console for LLM logs
4. Verify badge appears on results page

### Automated Test
```bash
./test-llm.sh
```

### Build Test
```bash
npm run build
```

## Support

- **Documentation**: See `LLM_INTEGRATION_VERIFIED.md`
- **Issues**: https://github.com/codoncareai-oss/codoncareai_PATNA/issues
- **API Docs**: https://github.com/marketplace/models

## License

Educational use only. Not for medical diagnosis.
