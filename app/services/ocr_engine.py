"""
app/services/ocr_engine.py
Isolated OCR engine — swap this file to use a different OCR backend.
Currently uses pytesseract + PyMuPDF page rendering.
"""
import logging
import fitz
from PIL import Image
import io

logger = logging.getLogger(__name__)

def _import_tesseract():
    try:
        import pytesseract
        return pytesseract
    except ImportError:
        return None

def run_ocr_on_pdf(pdf_id: str, pdf_path: str) -> list[dict]:
    """
    OCR a PDF that has no text layer.
    Returns a list of dicts: {page, text, x, y, width, height}
    Each entry represents one detected text block.
    """
    pytesseract = _import_tesseract()
    if pytesseract is None:
        logger.error("pytesseract is not installed. Cannot run OCR.")
        return []

    results = []
    doc = fitz.open(pdf_path)

    for page_num, page in enumerate(doc):
        # Render page to image at 200 DPI for good accuracy
        mat = fitz.Matrix(200 / 72, 200 / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_bytes))

        # Run tesseract, get detailed data with bounding boxes
        try:
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        except Exception as e:
            logger.warning(f"OCR failed on page {page_num}: {e}")
            continue

        n = len(data["text"])
        scale = 72 / 200  # convert pixels back to PDF points

        for i in range(n):
            text = (data["text"][i] or "").strip()
            conf = int(data["conf"][i])
            if not text or conf < 20:
                continue

            x = data["left"][i] * scale
            y = data["top"][i] * scale
            w = data["width"][i] * scale
            h = data["height"][i] * scale

            results.append({
                "pdf_id": pdf_id,
                "page": page_num,
                "text": text,
                "x": x,
                "y": y,
                "width": w,
                "height": h,
                "font": "Unknown-OCR",
                "font_size": round(h * 0.75, 1),
                "color": "#ffffff",
                "rotation": 0.0
            })

    doc.close()
    return results
