from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.models.suggestion import SuggestionModel
from app.models.text_block import TextBlockModel
from app.models import course as course_model
from app.models.user import find_by_id
from app.routers.auth import require_role, get_current_user

router = APIRouter(prefix="/api/suggestions", tags=["suggestions"])

class SuggestionBlockInput(BaseModel):
    block_id: str
    original_text: str
    replacement_text: str

class SuggestionInput(BaseModel):
    course_id: str
    subject_id: str
    pdf_id: Optional[str] = None
    blocks: List[SuggestionBlockInput]

@router.post("")
def submit_suggestion(data: SuggestionInput, user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    student_id = user["id"]
    
    for block in data.blocks:
        if block.original_text.strip() != block.replacement_text.strip():
            SuggestionModel.create(
                course_id=data.course_id,
                subject_id=data.subject_id,
                pdf_id=data.pdf_id,
                block_id=block.block_id,
                original_text=block.original_text,
                replacement_text=block.replacement_text,
                student_id=student_id
            )
            
    return {"status": "success"}

@router.get("")
def get_suggestions(_=Depends(require_role("teacher", "admin"))):
    suggestions = SuggestionModel.get_all()
    # Enrich with student names
    for s in suggestions:
        student_names = []
        for sid in s["student_ids"]:
            u = find_by_id(sid)
            if u:
                student_names.append(u["name"])
            else:
                student_names.append("Unknown Student")
        s["student_names"] = student_names
    return suggestions

@router.post("/{suggestion_id}/approve")
def approve_suggestion(suggestion_id: str, _=Depends(require_role("teacher", "admin"))):
    suggestion = SuggestionModel.get_by_id(suggestion_id)
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
        
    # Apply the change
    if suggestion.get("pdf_id"):
        # It's a PDF text block
        TextBlockModel.update_text(suggestion["block_id"], suggestion["replacement_text"])
    else:
        # It's an HTML note
        # Replace the original_text with replacement_text in the subject notes
        courses = course_model.read_all()
        updated = False
        for c in courses:
            if c["id"] == suggestion["course_id"]:
                for s in c.get("subjects", []):
                    if s["id"] == suggestion["subject_id"]:
                        if s.get("notes") and suggestion["original_text"] in s["notes"]:
                            s["notes"] = s["notes"].replace(suggestion["original_text"], suggestion["replacement_text"])
                            course_model.write_all(courses)
                            updated = True
                            break
                if updated:
                    break
        if not updated:
            # Maybe it was already modified or not found, but we still delete suggestion
            pass
            
    # Remove the suggestion
    SuggestionModel.delete(suggestion_id)
    return {"status": "success"}

@router.post("/{suggestion_id}/reject")
def reject_suggestion(suggestion_id: str, _=Depends(require_role("teacher", "admin"))):
    suggestion = SuggestionModel.get_by_id(suggestion_id)
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
        
    SuggestionModel.delete(suggestion_id)
    return {"status": "success"}
