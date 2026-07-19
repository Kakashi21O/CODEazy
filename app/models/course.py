import json
from pathlib import Path
from typing import Dict, Any, List
from app.config import DATA_DIR

FILE_PATH = DATA_DIR / "courses.json"

def read_all() -> List[Dict[str, Any]]:
    if not FILE_PATH.exists():
        return []
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_all(courses: List[Dict[str, Any]]):
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)

def find_all() -> List[Dict[str, Any]]:
    courses = read_all()
    result = []
    for c in courses:
        meta = {k: v for k, v in c.items() if k != 'subjects'}
        meta['subjectCount'] = len(c.get('subjects', []))
        result.append(meta)
    return result

def find_by_id(course_id: str) -> Dict[str, Any]:
    return next((c for c in read_all() if c["id"] == course_id), None)

def find_subjects(course_id: str) -> List[Dict[str, Any]]:
    course = find_by_id(course_id)
    return course.get("subjects") if course else None

def find_subject_by_id(subject_id: str) -> Dict[str, Any]:
    courses = read_all()
    for course in courses:
        subject = next((s for s in course.get("subjects", []) if s["id"] == subject_id), None)
        if subject:
            subject_copy = subject.copy()
            subject_copy["courseId"] = course["id"]
            subject_copy["courseTitle"] = course["title"]
            return subject_copy
    return None
