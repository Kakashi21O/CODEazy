from fastapi import APIRouter, Depends
from app.routers.auth import get_current_user_id
from app.models import progress as progress_model
from app.models import course as course_model

router = APIRouter()

@router.get("")
def get_progress(user_id: str = Depends(get_current_user_id)):
    completed = progress_model.get_for_user(user_id)
    courses = course_model.find_all()
    
    summary = []
    for course in courses:
        full_course = course_model.find_by_id(course["id"])
        total_subjects = len(full_course.get("subjects", []))
        completed_subjects = sum(1 for s in full_course.get("subjects", []) if s["id"] in completed)
        
        percent = round((completed_subjects / total_subjects) * 100) if total_subjects > 0 else 0
        
        summary.append({
            "courseId": course["id"],
            "courseTitle": course["title"],
            "icon": course["icon"],
            "totalSubjects": total_subjects,
            "completedSubjects": completed_subjects,
            "percent": percent,
        })
        
    return {"completed": completed, "summary": summary}

@router.post("/{subject_id}")
def mark_complete(subject_id: str, user_id: str = Depends(get_current_user_id)):
    result = progress_model.mark_complete(user_id, subject_id)
    return {"subjectId": subject_id, **result}

@router.delete("/{subject_id}")
def mark_incomplete(subject_id: str, user_id: str = Depends(get_current_user_id)):
    progress_model.mark_incomplete(user_id, subject_id)
    return {"subjectId": subject_id, "status": "removed"}
