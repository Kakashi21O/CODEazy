from app.db import get_db
import uuid
from typing import List, Dict, Any

class EditSuggestionModel:
    @staticmethod
    def create(block_id: str, student_id: str, old_text: str, new_text: str) -> str:
        conn = get_db()
        c = conn.cursor()
        sugg_id = str(uuid.uuid4())
        c.execute('''
            INSERT INTO edit_suggestions (id, block_id, student_id, old_text, new_text, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        ''', (sugg_id, block_id, student_id, old_text, new_text))
        conn.commit()
        conn.close()
        return sugg_id

    @staticmethod
    def get_pending() -> List[Dict[str, Any]]:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM edit_suggestions WHERE status = "pending"')
        rows = c.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def get_by_id(sugg_id: str) -> Dict[str, Any]:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM edit_suggestions WHERE id = ?', (sugg_id,))
        row = c.fetchone()
        conn.close()
        return dict(row) if row else None

    @staticmethod
    def get_pending_by_pdf(pdf_id: str) -> List[Dict[str, Any]]:
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            SELECT s.* FROM edit_suggestions s
            JOIN text_blocks b ON s.block_id = b.id
            WHERE s.status = "pending" AND b.pdf_id = ?
        ''', (pdf_id,))
        rows = c.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    @staticmethod
    def update_status(sugg_id: str, status: str, reason: str = None):
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            UPDATE edit_suggestions 
            SET status = ?, teacher_reason = ?, reviewed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (status, reason, sugg_id))
        conn.commit()
        conn.close()
