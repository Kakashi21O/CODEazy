import fitz

pdf_path = r"c:\Users\vijay\OneDrive\Documents\Git\CODEazy\server\data\pdfs\course_python_4f87e9.pdf"
doc = fitz.open(pdf_path)
page = doc[1] # page 2

words = page.get_text("words")
grouped_lines = []
current_y1 = None
current_line = []

# Sort by bottom y (w[3])
words_sorted_y = sorted(words, key=lambda w: w[3])

for w in words_sorted_y:
    x0, y0, x1, y1, word, block_no, line_no, word_no = w
    if current_y1 is None or abs(y1 - current_y1) > 5:
        if current_line:
            grouped_lines.append(current_line)
        current_line = [w]
        current_y1 = y1
    else:
        current_line.append(w)
if current_line:
    grouped_lines.append(current_line)

for line in grouped_lines:
    line.sort(key=lambda w: w[0])
    line_text = " ".join([w[4] for w in line])
    print("LINE:", line_text)
