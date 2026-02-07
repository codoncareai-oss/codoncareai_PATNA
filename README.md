# CodonCareAI

**Awareness Through Trends in Kidney Health**

CodonCareAI is an educational medical awareness web application that helps individuals track trends in their kidney health markers over time. This is NOT a diagnostic tool, medical device, or treatment recommendation system.

## 🎯 Purpose

- Educational awareness tool for kidney health trends
- Visualize eGFR, creatinine, and other markers over time
- Empower informed conversations with healthcare providers
- Privacy-first: all processing happens in your browser

## 🚀 Tech Stack

- React (Vite)
- JavaScript
- Tailwind CSS
- Recharts
- Framer Motion
- Frontend-only (no backend/database)

## 📦 Installation

```bash
npm install
```

## 🛠️ Development

```bash
npm run dev
```

## 🏗️ Build

```bash
npm run build
```

## 🌐 Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Deploy (zero configuration needed)

## ⚠️ Medical Disclaimer

CodonCareAI is an educational awareness tool ONLY. It shows trends from uploaded reports. It is NOT a medical diagnosis, NOT medical advice, NOT a treatment recommendation, and NOT a substitute for professional healthcare.

## 📁 Project Structure

```
src/
├── pages/
│   ├── Home.jsx
│   ├── Upload.jsx
│   ├── Results.jsx
│   └── About.jsx
├── components/
│   ├── Navbar.jsx
│   ├── Disclaimer.jsx
│   ├── EGFRChart.jsx
│   ├── MarkerCard.jsx
│   └── TrendBadge.jsx
├── utils/
│   ├── calculateEGFR.js
│   ├── parseCSV.js
│   └── slope.js
```

## 🔬 Features

- Upload lab reports (CSV, PDF, PNG, JPG)
- **Real PDF text extraction** using PDF.js
- **OCR for scanned documents** using Tesseract.js
- **Intelligent medical data parsing** with pattern matching
- **Date-value mapping** for chronological trends
- Calculate eGFR using CKD-EPI 2021 equation
- Visualize trends with interactive charts
- Track serum creatinine, PTH, hemoglobin, phosphorus, bicarbonate
- Calculate eGFR slope and trend status
- **Extraction confidence indicators** (High/Medium/Low)
- **Debug panel** to view extracted raw text
- Privacy-first: no server uploads, all processing in browser

## 📊 CSV Format

For best results, upload a CSV with these columns:

```csv
date,creatinine,egfr,pth,hemoglobin,phosphorus,bicarbonate
2024-01-15,1.2,65.3,45,13.5,4.2,22
2024-03-20,1.35,58.7,52,13.2,4.5,21
```

## 📄 PDF & Image Support

**PDF Reports:**
- Text-based PDFs are automatically parsed
- Scanned PDFs should be uploaded as images for OCR

**Image Reports (PNG/JPG):**
- Tesseract.js OCR extracts text automatically
- Works best with clear, high-contrast images
- Progress indicator shows OCR status

**Extracted Data:**
- Serum Creatinine, eGFR, Hemoglobin, PTH, Phosphorus, Bicarbonate
- Report dates are automatically detected
- Confidence level indicates extraction quality

## 🤝 Contributing

This is an academic project. Contributions welcome for:
- Improved visualizations
- Better CSV parsing
- Accessibility enhancements
- Documentation

## 📄 License

MIT License - See LICENSE file

## 💙 Dedication

Inspired by personal experience with late-stage CKD diagnosis. Built to help others recognize kidney health trends earlier.

---

**Always consult qualified healthcare professionals for medical advice.**
