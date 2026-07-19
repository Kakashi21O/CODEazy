import fitz

pdf_path = r"c:\Users\vijay\OneDrive\Documents\Git\CODEazy\server\data\pdfs\course_python_4f87e9.pdf"
doc = fitz.open(pdf_path)
page = doc[1] # page 2

for w in page.get_text("words"):
    print(f"Word: {repr(w[4])} at bbox={w[:4]}")
