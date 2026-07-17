import json
from pathlib import Path
from typing import Dict, Any
from app.config import DATA_DIR
from datetime import datetime

FILE_PATH = DATA_DIR / "progress.json"

def read_all() -> Dict[str, Any]:
    if not FILE_PATH.exists():
        return {}
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_all(data: Dict[str, Any]):
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def get_for_user(user_id: str) -> Dict[str, Any]:
    data = read_all()
    return data.get(user_id, {})

def mark_complete(user_id: str, subject_id: str) -> Dict[str, Any]:
    data = read_all()
    if user_id not in data:
        data[user_id] = {}
    data[user_id][subject_id] = {"completedAt": datetime.utcnow().isoformat() + "Z"}
    write_all(data)
    return data[user_id][subject_id]

def mark_incomplete(user_id: str, subject_id: str):
    data = read_all()
    if user_id in data and subject_id in data[user_id]:
        del data[user_id][subject_id]
        write_all(data)
