from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
import jwt
from datetime import datetime, timedelta
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRES_IN_DAYS
from app.models import user as user_model

router = APIRouter()

VALID_ROLES = {"student", "teacher", "admin"}

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ── Auth helpers ────────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRES_IN_DAYS)
    encoded_jwt = jwt.encode({"id": user_id, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token — please log in")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(user_id: str = Depends(get_current_user_id)) -> dict:
    user = user_model.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def require_role(*roles):
    def checker(user: dict = Depends(get_current_user)):
        if user.get("role", "student") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker

# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
def register(request: RegisterRequest):
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail={"error": "Password must be at least 6 characters"})
    if user_model.find_by_email(request.email):
        raise HTTPException(status_code=409, detail={"error": "Email already registered"})
    hashed = user_model.get_password_hash(request.password)
    user = user_model.create(request.name, request.email, hashed)
    return {"token": create_access_token(user["id"]), "user": user_model.to_public(user)}

@router.post("/login")
def login(request: LoginRequest):
    user = user_model.find_by_email(request.email)
    if not user or not user_model.verify_password(request.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail={"error": "Invalid email or password"})
    return {"token": create_access_token(user["id"]), "user": user_model.to_public(user)}

@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return {"user": user_model.to_public(user)}
