import fitz

pdf_path = r"c:\Users\vijay\OneDrive\Documents\Git\CODEazy\server\data\pdfs\course_python_4f87e9.pdf"
doc = fitz.open(pdf_path)

# Let's inspect page 8 (0-indexed 7)
page = doc[7]

# Find tables and their bboxes
finder = page.find_tables()
tables = finder.tables

# Extract all words
words = page.get_text("words")

# Filter out words that are inside any table's bbox
non_table_words = []
for w in words:
    x0, y0, x1, y1, word, block_no, line_no, word_no = w
    inside_table = False
    for t in tables:
        tx0, ty0, tx1, ty1 = t.bbox
        # Add a tiny margin to ensure we catch boundary words
        if tx0 - 2 <= x0 <= tx1 + 2 and ty0 - 2 <= y0 <= ty1 + 2:
            inside_table = True
            break
    if not inside_table:
        non_table_words.append(w)

# Group non-table words by y, then sort by x
grouped_lines = []
current_y = None
current_line = []
words_sorted_y = sorted(non_table_words, key=lambda w: w[1])

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

for line in grouped_lines:
    line.sort(key=lambda w: w[0])

# Now we have lines and tables. We can sort them together by their y-coordinates!
elements = [] # list of tuples: (y_coord, type, content)

for line in grouped_lines:
    # y-coord of the line is the average or y0
    y_coord = line[0][1]
    # construct line text
    line_text = []
    prev_x1 = None
    for w in line:
        x0, y0, x1, y1, word, block_no, line_no, word_no = w
        if prev_x1 is not None:
            gap = x0 - prev_x1
            spaces = int(gap / 8)
            if spaces > 0:
                line_text.append(" " * spaces)
            else:
                line_text.append(" ")
        line_text.append(word)
        prev_x1 = x1
    elements.append((y_coord, "line", "".join(line_text)))

for i, t in enumerate(tables):
    y_coord = t.bbox[1]
    # Format table as HTML
    rows = t.extract()
    html_table = "<table border='1' style='border-collapse: collapse; width: 100%; margin: 16px 0; color: #ccc; border-color: rgba(255,255,255,0.1);'>"
    for r_idx, row in enumerate(rows):
        html_table += "<tr>"
        for val in row:
            val = val or ""
            # Preserve line breaks in cells if any
            val_formatted = val.replace("\n", "<br>")
            if r_idx == 0:
                html_table += f"<th style='padding: 10px; background: rgba(0,191,255,0.1); text-align: left;'>{val_formatted}</th>"
            else:
                html_table += f"<td style='padding: 10px;'>{val_formatted}</td>"
        html_table += "</tr>"
    html_table += "</table>"
    elements.append((y_coord, "table", html_table))

# Sort all elements by y_coord
elements.sort(key=lambda e: e[0])

for el in elements:
    print(f"[{el[1].upper()}]: {el[2][:150]}")
