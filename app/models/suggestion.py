import json
import uuid
from typing import List, Dict, Any, Optional
from app.db import get_db

class SuggestionModel:
    @staticmethod
    def create(course_id: str, subject_id: str, pdf_id: Optional[str], block_id: str, original_text: str, replacement_text: str, student_id: str) -> str:
        conn = get_db()
        c = conn.cursor()
        
        # Check if identical pending suggestion exists
        c.execute('''
            SELECT id, student_ids FROM edit_suggestions 
            WHERE course_id = ? AND subject_id = ? AND IFNULL(pdf_id, '') = IFNULL(?, '') AND block_id = ? AND original_text = ? AND replacement_text = ?
        ''', (course_id, subject_id, pdf_id, block_id, original_text, replacement_text))
        
        row = c.fetchone()
        
        if row:
            s_id = row['id']
            student_ids = json.loads(row['student_ids'])
            if student_id not in student_ids:
                student_ids.append(student_id)
                c.execute('UPDATE edit_suggestions SET student_ids = ? WHERE id = ?', (json.dumps(student_ids), s_id))
                conn.commit()
            conn.close()
            return s_id
        else:
            s_id = str(uuid.uuid4())
            student_ids = json.dumps([student_id])
            c.execute('''
                INSERT INTO edit_suggestions (id, course_id, subject_id, pdf_id, block_id, original_text, replacement_text, student_ids)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (s_id, course_id, subject_id, pdf_id, block_id, original_text, replacement_text, student_ids))
            conn.commit()
            conn.close()
            return s_id

    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM edit_suggestions ORDER BY created_at ASC')
        rows = c.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            d = dict(row)
            d['student_ids'] = json.loads(d['student_ids'])
            results.append(d)
        return results

    @staticmethod
    def get_by_id(suggestion_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT * FROM edit_suggestions WHERE id = ?', (suggestion_id,))
        row = c.fetchone()
        conn.close()
        
        if row:
            d = dict(row)
            d['student_ids'] = json.loads(d['student_ids'])
            return d
        return None

    @staticmethod
    def delete(suggestion_id: str):
        conn = get_db()
        c = conn.cursor()
        c.execute('DELETE FROM edit_suggestions WHERE id = ?', (suggestion_id,))
        conn.commit()
        conn.close()
