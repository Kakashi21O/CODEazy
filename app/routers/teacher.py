from fastapi import APIRouter
import json
from app.config import DATA_DIR

router = APIRouter()
FILE_PATH = DATA_DIR / "teachers.json"

@router.get("")
def get_teachers():
    if not FILE_PATH.exists():
        return []
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)
