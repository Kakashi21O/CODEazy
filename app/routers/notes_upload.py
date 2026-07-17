import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.routers.auth import require_role
from app.config import DATA_DIR
from app.models import course as course_model

router = APIRouter()

class NoteUpload(BaseModel):
    courseId: str
    title: str
    duration: str
    notes: str

@router.post("/upload")
def upload_notes(body: NoteUpload, _=Depends(require_role("teacher", "admin"))):
    courses_file = DATA_DIR / "courses.json"
    with open(courses_file, 'r', encoding='utf-8') as f:
        courses = json.load(f)

    course = next((c for c in courses if c["id"] == body.courseId), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    import uuid
    new_subject = {
        "id": f"{body.courseId}_{uuid.uuid4().hex[:6]}",
        "title": body.title,
        "duration": body.duration,
        "notes": body.notes
    }
    course["subjects"].append(new_subject)

    with open(courses_file, 'w', encoding='utf-8') as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)

    return {"status": "added", "subject": new_subject}
