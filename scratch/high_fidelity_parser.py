import fitz
import re

pdf_path = r"c:\Users\vijay\OneDrive\Documents\Git\CODEazy\server\data\pdfs\course_python_4f87e9.pdf"
doc = fitz.open(pdf_path)

def clean_font_name(font):
    if not font:
        return "sans-serif"
    # Remove subset tags like "ABCDEF+"
    if "+" in font:
        font = font.split("+")[1]
    return font

def get_word_style(w, dict_spans):
    # Find span that contains this word's center point
    wx = (w[0] + w[2]) / 2
    wy = (w[1] + w[3]) / 2
    for s in dict_spans:
        sx0, sy0, sx1, sy1 = s["bbox"]
        if sx0 <= wx <= sx1 and sy0 <= wy <= sy1:
            return clean_font_name(s["font"]), s["size"], s["color"]
    return "sans-serif", 12.0, 0

def format_page_to_html(page):
    tables = page.find_tables().tables
    words = page.get_text("words")
    
    # Get spans for font matching
    dict_data = page.get_text("dict")
    spans = []
    for b in dict_data["blocks"]:
        if b["type"] == 0:
            for l in b["lines"]:
                spans.extend(l["spans"])
                
    # Filter words in tables
    non_table_words = []
    for w in words:
        x0, y0, x1, y1, word = w[:5]
        in_table = False
        for t in tables:
            tx0, ty0, tx1, ty1 = t.bbox
            if tx0 - 2 <= x0 <= tx1 + 2 and ty0 - 2 <= y0 <= ty1 + 2:
                in_table = True
                break
        if not in_table:
            non_table_words.append(w)
            
    # Group words into lines
    lines = []
    current_y = None
    current_line = []
    for w in sorted(non_table_words, key=lambda x: x[1]):
        x0, y0, x1, y1, word = w[:5]
        if current_y is None or abs(y0 - current_y) > 4:
            if current_line:
                lines.append(current_line)
            current_line = [w]
            current_y = y0
        else:
            current_line.append(w)
    if current_line:
        lines.append(current_line)
        
    # Sort words within each line
    for line in lines:
        line.sort(key=lambda x: x[0])
        
    # Build text for each line, preserving approximate spacing and style
    styled_lines = []
    for line in lines:
        line_text = []
        prev_x1 = None
        line_fonts = []
        line_sizes = []
        
        for w in line:
            x0, y0, x1, y1, word = w[:5]
            font, size, color = get_word_style(w, spans)
            line_fonts.append(font)
            line_sizes.append(size)
            
            if prev_x1 is not None:
                gap = x0 - prev_x1
                # calculate space characters to insert based on gap
                space_count = int(gap / (size * 0.45))
                if space_count > 0:
                    line_text.append("&nbsp;" * space_count)
                else:
                    line_text.append(" ")
            line_text.append(word)
            prev_x1 = x1
            
        avg_size = sum(line_sizes) / len(line_sizes) if line_sizes else 12.0
        most_common_font = max(set(line_fonts), key=line_fonts.count) if line_fonts else "sans-serif"
        raw_text = "".join(line_text)
        
        # Strip html entities for plain text checks
        plain_text = raw_text.replace("&nbsp;", " ")
        
        styled_lines.append({
            "y": line[0][1],
            "text": raw_text,
            "plain": plain_text,
            "font": most_common_font,
            "size": avg_size,
            "type": "text"
        })
        
    # Merge tables into the elements stream
    elements = []
    for sl in styled_lines:
        elements.append((sl["y"], "text", sl))
        
    for t in tables:
        # Generate HTML table
        rows = t.extract()
        html = "<div class='table-responsive'><table class='notes-table'>"
        for r_idx, r in enumerate(rows):
            html += "<tr>"
            for val in r:
                val = (val or "").strip().replace("\n", "<br>")
                if r_idx == 0:
                    html += f"<th>{val}</th>"
                else:
                    html += f"<td>{val}</td>"
            html += "</tr>"
        html += "</table></div>"
        elements.append((t.bbox[1], "table", html))
        
    # Sort all elements by y-coordinate
    elements.sort(key=lambda x: x[0])
    
    # Process elements into HTML blocks
    html_output = []
    in_code_block = False
    code_lines = []
    
    # Helper to check if a line is likely code
    def is_code_line(line_obj):
        text = line_obj["plain"].strip()
        # Common code patterns
        if re.match(r"^\d+\.\s*(#|=|\bprint\b|\bdef\b|\bif\b|\bfor\b)", text):
            return True
        if text.startswith("#") or text.startswith("print(") or "=" in text and not "is used for" in text:
            # exclude simple text like "Immutable: Once a string is created..."
            if ":" in text and not text.startswith("print("):
                return False
            return True
        if "mono" in line_obj["font"].lower() or "courier" in line_obj["font"].lower():
            return True
        return False
        
    # Helper to check if a line is a diagram (e.g. index alignment)
    def is_diagram_line(line_obj):
        text = line_obj["plain"].strip()
        # High ratio of double spaces, or just single characters/numbers spaced apart
        parts = re.split(r'\s+', text)
        if len(parts) > 3 and all(len(p) <= 2 or (p.startswith("-") and len(p) <= 3) for p in parts):
            return True
        return False

    i = 0
    while i < len(elements):
        y, etype, content = elements[i]
        
        if etype == "table":
            if in_code_block:
                html_output.append(f"<pre><code>{chr(10).join(code_lines)}</code></pre>")
                code_lines = []
                in_code_block = False
            html_output.append(content)
            i += 1
            continue
            
        # Standard line
        line = content
        text = line["text"]
        plain = line["plain"].strip()
        
        if not plain:
            i += 1
            continue
            
        # Code block detection
        if is_code_line(line) or (in_code_block and plain and not plain.startswith("Characteristics") and not plain.startswith("Example:")):
            if not in_code_block:
                in_code_block = True
                code_lines = []
            code_lines.append(line["plain"])
            i += 1
            continue
        else:
            if in_code_block:
                html_output.append(f"<pre><code>{chr(10).join(code_lines)}</code></pre>")
                code_lines = []
                in_code_block = False
                
        # Diagram lines (preserve monospace and spaces)
        if is_diagram_line(line):
            html_output.append(f"<pre class='diagram' style='font-family: monospace; background: rgba(0,0,0,0.2); padding: 8px 16px;'>{line['plain']}</pre>")
            i += 1
            continue
            
        # Heading detection
        if line["size"] > 22 or "bold" in line["font"].lower() or "extra" in line["font"].lower() or line["size"] > 18 and (line["y"] < 120 or plain.endswith("String")):
            if line["size"] > 24:
                html_output.append(f"<h1 class='notes-h1'>{plain}</h1>")
            elif line["size"] > 18:
                html_output.append(f"<h2 class='notes-h2'>{plain}</h2>")
            else:
                html_output.append(f"<h3 class='notes-h3'>{plain}</h3>")
            i += 1
            continue
            
        # Bullet lists
        if plain.startswith("•") or plain.startswith("-") or plain.startswith("*") or (plain.startswith("A ") and "string" in plain):
            bullet_text = plain.lstrip("•-* ").strip()
            # If bold prefix exists (like "Immutable: Once...")
            if ":" in bullet_text:
                parts = bullet_text.split(":", 1)
                html_output.append(f"<p class='notes-bullet'><strong>{parts[0]}:</strong>{parts[1]}</p>")
            else:
                html_output.append(f"<p class='notes-bullet'>• {bullet_text}</p>")
            i += 1
            continue
            
        # Regular paragraph
        html_output.append(f"<p class='notes-para'>{text}</p>")
        i += 1
        
    if in_code_block:
        html_output.append(f"<pre><code>{chr(10).join(code_lines)}</code></pre>")
        
    return "\n".join(html_output)

# Test print of page 2 and page 5 and page 8
print("=== PAGE 2 ===")
print(format_page_to_html(doc[1]))
print("=== PAGE 5 ===")
print(format_page_to_html(doc[4]))
print("=== PAGE 8 ===")
print(format_page_to_html(doc[7]))
