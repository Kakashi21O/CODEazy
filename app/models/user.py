import json
from typing import Dict, Any, List
from app.config import DATA_DIR
import uuid
from passlib.context import CryptContext

FILE_PATH = DATA_DIR / "users.json"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def read_all() -> List[Dict[str, Any]]:
    if not FILE_PATH.exists():
        return []
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_all(users: List[Dict[str, Any]]):
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=2)

def find_by_id(user_id: str) -> Dict[str, Any]:
    return next((u for u in read_all() if u["id"] == user_id), None)

def find_by_email(email: str) -> Dict[str, Any]:
    return next((u for u in read_all() if u["email"].lower() == email.lower()), None)

def create(name: str, email: str, password_hash: str, role: str = "student") -> Dict[str, Any]:
    users = read_all()
    user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email.lower(),
        "passwordHash": password_hash,
        "role": role,
    }
    users.append(user)
    write_all(users)
    return user

def find_all() -> List[Dict[str, Any]]:
    return [to_public(u) for u in read_all()]

def update_role(user_id: str, role: str) -> bool:
    users = read_all()
    for u in users:
        if u["id"] == user_id:
            u["role"] = role
            write_all(users)
            return True
    return False

def delete_user(user_id: str) -> bool:
    users = read_all()

    for i, user in enumerate(users):
        if user["id"] == user_id:
            users.pop(i)
            write_all(users)
            return True

    return False

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def to_public(user: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in user.items() if k != "passwordHash"}
