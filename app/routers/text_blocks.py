from fastapi import APIRouter, Depends
from app.models.text_block import TextBlockModel
from app.routers.auth import require_role
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter(prefix="/api/blocks", tags=["text_blocks"])

@router.get("/{pdf_id}")
def get_blocks(pdf_id: str):
    blocks = TextBlockModel.get_by_pdf(pdf_id)
    return blocks

class TextBlockUpdate(BaseModel):
    new_text: str

@router.put("/{block_id}")
def update_block(block_id: str, update: TextBlockUpdate, user = Depends(require_role("teacher", "admin"))):
    TextBlockModel.update_text(block_id, update.new_text)
    return {"message": "Block updated"}
