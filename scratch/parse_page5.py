import fitz

pdf_path = r"c:\Users\vijay\OneDrive\Documents\Git\CODEazy\server\data\pdfs\course_python_4f87e9.pdf"
doc = fitz.open(pdf_path)

page = doc[4] # page 5
print(f"--- Page 5 Blocks ---")
for b in page.get_text("blocks"):
    print(f"Block: bbox={b[:4]}, text={repr(b[4])}")
