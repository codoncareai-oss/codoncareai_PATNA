from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import tempfile
import os
from typing import List, Dict
import fitz  # PyMuPDF for PDF handling

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

@app.post("/ocr/extract")
async def extract_raw_rows(file: UploadFile = File(...)):
    """
    Extract raw rows from PDF or image using PaddleOCR
    STRICT: One visible line = one raw row
    NO merging, NO deletion, NO inference
    """
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        rows = []
        row_id = 1
        
        # Handle PDF
        if file.filename.lower().endswith('.pdf'):
            pdf_doc = fitz.open(tmp_path)
            
            for page_num in range(len(pdf_doc)):
                page = pdf_doc[page_num]
                
                # Convert page to image
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_path = f"{tmp_path}_page_{page_num}.png"
                pix.save(img_path)
                
                # Run PaddleOCR
                result = ocr.ocr(img_path, cls=True)
                
                if result and result[0]:
                    for line in result[0]:
                        text = line[1][0]
                        confidence = line[1][1]
                        
                        rows.append({
                            "row_id": row_id,
                            "raw_text": text,
                            "page": page_num + 1,
                            "confidence": round(confidence, 3)
                        })
                        row_id += 1
                
                # Cleanup page image
                if os.path.exists(img_path):
                    os.remove(img_path)
            
            pdf_doc.close()
        
        # Handle Image
        else:
            result = ocr.ocr(tmp_path, cls=True)
            
            if result and result[0]:
                for line in result[0]:
                    text = line[1][0]
                    confidence = line[1][1]
                    
                    rows.append({
                        "row_id": row_id,
                        "raw_text": text,
                        "page": 1,
                        "confidence": round(confidence, 3)
                    })
                    row_id += 1
        
        print(f"✅ PaddleOCR extracted {len(rows)} raw rows from {file.filename}")
        
        return {"rows": rows}
    
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.get("/health")
async def health_check():
    return {"status": "ok", "ocr": "paddleocr"}

import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

