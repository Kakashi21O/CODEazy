import fitz

pdf_path = r"c:\Users\vijay\OneDrive\Documents\Git\CODEazy\server\data\pdfs\course_python_4f87e9.pdf"
doc = fitz.open(pdf_path)
page = doc[4] # page 5

words = page.get_text("words")
# Sort words by y, then x
# Group words by similar y (within 3 points)
grouped_lines = []
current_y = None
current_line = []

# Sort by y first
words_sorted_y = sorted(words, key=lambda w: w[1])

for w in words_sorted_y:
    x0, y0, x1, y1, word, block_no, line_no, word_no = w
    if current_y is None or abs(y0 - current_y) > 3:
        if current_line:
            grouped_lines.append(current_line)
        current_line = [w]
        current_y = y0
    else:
        current_line.append(w)
if current_line:
    grouped_lines.append(current_line)

# Sort each line by x
for line in grouped_lines:
    line.sort(key=lambda w: w[0])
    line_text = []
    # Try to preserve spacing by looking at gap between words
    prev_x1 = None
    for w in line:
        x0, y0, x1, y1, word, block_no, line_no, word_no = w
        if prev_x1 is not None:
            gap = x0 - prev_x1
            # Add spaces proportional to gap
            spaces = int(gap / 8)  # assume average char width is ~8
            if spaces > 0:
                line_text.append(" " * spaces)
            else:
                line_text.append(" ")
        line_text.append(word)
        prev_x1 = x1
    print("LINE:", "".join(line_text))
