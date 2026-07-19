from fastapi import APIRouter, Depends, HTTPException, Body
from app.models.edit_suggestion import EditSuggestionModel
from app.models.text_block import TextBlockModel
from app.routers.auth import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/suggestions", tags=["edit_suggestions"])

class SuggestionCreate(BaseModel):
    block_id: str
    old_text: str
    new_text: str

@router.post("")
def create_suggestion(sugg: SuggestionCreate, user = Depends(require_role("student", "teacher", "admin"))):
    # Anyone can suggest
    sugg_id = EditSuggestionModel.create(
        block_id=sugg.block_id, 
        student_id=user["id"], 
        old_text=sugg.old_text, 
        new_text=sugg.new_text
    )
    return {"message": "Suggestion created successfully", "id": sugg_id}

@router.get("/pending")
def get_pending_suggestions(user = Depends(require_role("teacher", "admin"))):
    # Only teachers and admins can view pending suggestions across all blocks
    suggestions = EditSuggestionModel.get_pending()
    return suggestions

@router.get("/pdf/{pdf_id}")
def get_pending_by_pdf(pdf_id: str, user = Depends(require_role("teacher", "admin"))):
    return EditSuggestionModel.get_pending_by_pdf(pdf_id)

class SuggestionStatusUpdate(BaseModel):
    status: str
    reason: str = None

@router.put("/{sugg_id}/status")
def update_suggestion_status(sugg_id: str, update: SuggestionStatusUpdate, user = Depends(require_role("teacher", "admin"))):
    sugg = EditSuggestionModel.get_by_id(sugg_id)
    if not sugg:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    
    if update.status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # If accepted, update the actual text block
    if update.status == "accepted":
        TextBlockModel.update_text(sugg["block_id"], sugg["new_text"])
        
    EditSuggestionModel.update_status(sugg_id, update.status, update.reason)
    return {"message": f"Suggestion {update.status}"}
