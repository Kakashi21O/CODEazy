import fitz
import sys
import os

pdf_path = r"c:\Users\vijay\OneDrive\Documents\Git\CODEazy\server\data\pdfs\course_python_4f87e9.pdf"
doc = fitz.open(pdf_path)

# Let's inspect page 8 (0-indexed 7)
page = doc[7]
print(f"--- Page 8 Tables ---")
finder = page.find_tables()
tables = finder.tables
print(f"Found {len(tables)} tables")
for i, table in enumerate(tables):
    print(f"Table {i} bbox: {table.bbox}")
    print(table.extract()[:3])  # print first few rows

# Let's inspect text blocks
print(f"--- Page 8 Text Blocks ---")
for b in page.get_text("blocks"):
    print(f"Block: bbox={b[:4]}, text={repr(b[4][:100])}")
