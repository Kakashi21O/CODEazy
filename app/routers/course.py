from fastapi import APIRouter, HTTPException
from app.models import course as course_model

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
