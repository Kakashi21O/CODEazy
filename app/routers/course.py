from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.models import course as course_model
from app.routers.auth import require_role

router = APIRouter()

@router.get("")
def get_all_courses():
    return course_model.find_all()

@router.get("/subject/{subject_id}")
def get_subject(subject_id: str):
    subject = course_model.find_subject_by_id(subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail={"error": "Subject not found"})
    return subject

@router.get("/{course_id}")
def get_course(course_id: str):
    course = course_model.find_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail={"error": "Course not found"})
    return course

@router.get("/{course_id}/subjects")
def get_subjects(course_id: str):
    subjects = course_model.find_subjects(course_id)
    if subjects is None:
        raise HTTPException(status_code=404, detail={"error": "Course not found"})
    return subjects

class NoteEdit(BaseModel):
    notes: str

@router.put("/{course_id}/subjects/{subject_id}")
def update_subject(course_id: str, subject_id: str, body: NoteEdit, _=Depends(require_role("teacher", "admin"))):
    courses = course_model.read_all()
    
    for c in courses:
        if c["id"] == course_id:
            for s in c.get("subjects", []):
                if s["id"] == subject_id:
                    s["notes"] = body.notes
                    course_model.write_all(courses)
                    return {"status": "success"}
                    
    raise HTTPException(status_code=404, detail="Course or subject not found")
