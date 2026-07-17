from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.routers.auth import require_role
from app.models import user as user_model

router = APIRouter()

VALID_ROLES = {"student", "teacher", "admin"}

class RoleUpdate(BaseModel):
    role: str

@router.get("/users")
def list_users(_=Depends(require_role("admin"))):
    return user_model.find_all()

@router.patch("/users/{user_id}/role")
def assign_role(user_id: str, body: RoleUpdate, _=Depends(require_role("admin"))):
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if not user_model.update_role(user_id, body.role):
        raise HTTPException(status_code=404, detail="User not found")
    return {"userId": user_id, "role": body.role}
