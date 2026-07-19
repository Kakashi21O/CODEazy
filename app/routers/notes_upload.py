import json
import uuid
import shutil
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from app.routers.auth import require_role
from app.config import DATA_DIR
import pymupdf4llm
import markdown
from app.services.pdf_extractor import extract_and_save_blocks

router = APIRouter()

PDFS_DIR = DATA_DIR / "pdfs"
PDFS_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_notes(
    courseId: str = Form(...),
    title: str = Form(...),
    duration: str = Form(...),
    file: UploadFile = File(...),
    _=Depends(require_role("teacher", "admin"))
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    courses_file = DATA_DIR / "courses.json"
    with open(courses_file, 'r', encoding='utf-8') as f:
        courses = json.load(f)

    course = next((c for c in courses if c["id"] == courseId), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    subject_id = f"{courseId}_{uuid.uuid4().hex[:6]}"
    pdf_path = PDFS_DIR / f"{subject_id}.pdf"
    
    # Save PDF
    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract and save text blocks for the new editable overlay system, recovering high-fidelity HTML
    try:
        _, html_content = extract_and_save_blocks(pdf_id=subject_id, pdf_path=str(pdf_path))
    except Exception as e:
        html_content = f"<p>Error extracting text: {str(e)}</p>"

    new_subject = {
        "id": subject_id,
        "title": title,
        "duration": duration,
        "pdf_url": f"/api/pdfs/{subject_id}.pdf",
        "notes": html_content
    }
    
    course["subjects"].append(new_subject)

    with open(courses_file, 'w', encoding='utf-8') as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)

    return {"status": "added", "subject": new_subject}
