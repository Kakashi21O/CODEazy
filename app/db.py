import sqlite3
from app.config import DATA_DIR

DB_PATH = DATA_DIR / "pdf_edits.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    # TextBlock table
    c.execute('''
        CREATE TABLE IF NOT EXISTS text_blocks (
            id TEXT PRIMARY KEY,
            pdf_id TEXT NOT NULL,
            page INTEGER NOT NULL,
            text TEXT,
            x REAL,
            y REAL,
            width REAL,
            height REAL,
            font TEXT,
            font_size REAL,
            color TEXT,
            rotation REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize on import
init_db()
