from app.db import get_db
import uuid
from typing import List, Dict, Any

class TextBlockModel:
    @staticmethod
    def create(pdf_id: str, page: int, text: str, x: float, y: float, width: float, height: float, font: str, font_size: float, color: str, rotation: float) -> str:
        conn = get_db()
        c = conn.cursor()
        block_id = str(uuid.uuid4())
        c.execute('''
            INSERT INTO text_blocks (id, pdf_id, page, text, x, y, width, height, font, font_size, color, rotation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (block_id, pdf_id, page, text, x, y, width, height, font, font_size, color, rotation))
        conn.commit()
        conn.close()
        return block_id

    @staticmethod
    def get_by_pdf(pdf_id: str) -> List[Dict[str, Any]]:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM text_blocks WHERE pdf_id = ?', (pdf_id,))
        rows = c.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    @staticmethod
    def update_text(block_id: str, new_text: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('UPDATE text_blocks SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (new_text, block_id))
        conn.commit()
        conn.close()
