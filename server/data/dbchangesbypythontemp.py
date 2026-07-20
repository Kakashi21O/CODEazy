import sqlite3

conn = sqlite3.connect("pdf_edits.db")
cur = conn.cursor()

cur.execute("DELETE FROM text_blocks")
cur.execute("DELETE FROM edit_suggestions")

conn.commit()
conn.close()

print("Database cleared successfully.")