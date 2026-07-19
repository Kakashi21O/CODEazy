import fitz

pdf_path = r"c:\Users\vijay\OneDrive\Documents\Git\CODEazy\server\data\pdfs\course_python_4f87e9.pdf"
doc = fitz.open(pdf_path)
page = doc[4] # page 5

data = page.get_text("dict")
for b in data["blocks"]:
    if b["type"] == 0:
        print(f"Block bbox: {b['bbox']}")
        for l in b["lines"]:
            print(f"  Line bbox: {l['bbox']}")
            for s in l["spans"]:
                print(f"    Span: bbox={s['bbox']}, text={repr(s['text'])}, font={s['font']}, size={s['size']}, color={s['color']}")
