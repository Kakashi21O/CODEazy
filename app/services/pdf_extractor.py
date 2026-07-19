import fitz
import re
from app.models.text_block import TextBlockModel
from app.services.ocr_engine import run_ocr_on_pdf
import logging

logger = logging.getLogger(__name__)

def clean_font_name(font):
    if not font:
        return "sans-serif"
    if "+" in font:
        font = font.split("+")[1]
    return font

def get_word_style(w, dict_spans):
    wx = (w[0] + w[2]) / 2
    wy = (w[1] + w[3]) / 2
    for s in dict_spans:
        sx0, sy0, sx1, sy1 = s["bbox"]
        if sx0 <= wx <= sx1 and sy0 <= wy <= sy1:
            return clean_font_name(s["font"]), s["size"], s["color"]
    return "sans-serif", 12.0, 0

def clean_word_text(text):
    if len(text) == 1 and (ord(text) == 61623 or ord(text) == 0xf0b7 or ord(text) == 65533):
        return "•"
    return text

def extract_and_save_blocks(pdf_id: str, pdf_path: str) -> tuple[bool, str]:
    """
    Extracts text blocks and formats them into high-fidelity HTML.
    Saves text blocks with coordinates into the SQLite database.
    Returns (has_text_layer, html_content).
    """
    doc = fitz.open(pdf_path)
    has_text = False
    
    # Quick check for text layer
    for page in doc:
        if page.get_text("text").strip():
            has_text = True
            break
            
    if not has_text:
        doc.close()
        logger.info(f"No text layer found in {pdf_id}. Running OCR...")
        ocr_html = _run_ocr_placeholder(pdf_id, pdf_path)
        return False, ocr_html

    full_html = []
    
    for page_num, page in enumerate(doc):
        tables = page.find_tables().tables
        words = page.get_text("words")
        
        # Get spans for style/font recovery
        dict_data = page.get_text("dict")
        spans = []
        for b in dict_data["blocks"]:
            if b["type"] == 0:
                for l in b["lines"]:
                    spans.extend(l["spans"])
                    
        # Filter words inside tables
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
                
        # Group words into lines by bottom Y coordinate (y1)
        lines = []
        current_y1 = None
        current_line = []
        for w in sorted(non_table_words, key=lambda x: x[3]):
            x0, y0, x1, y1, word = w[:5]
            if current_y1 is None or abs(y1 - current_y1) > 5:
                if current_line:
                    lines.append(current_line)
                current_line = [w]
                current_y1 = y1
            else:
                current_line.append(w)
        if current_line:
            lines.append(current_line)
            
        # Sort words within each line by X coordinate
        for line in lines:
            line.sort(key=lambda x: x[0])
            
        # Build text for each line and calculate bounds/styles
        styled_lines = []
        for line in lines:
            line_text = []
            prev_x1 = None
            line_fonts = []
            line_sizes = []
            line_colors = []
            
            # Line bounding box
            lx0 = min(w[0] for w in line)
            ly0 = min(w[1] for w in line)
            lx1 = max(w[2] for w in line)
            ly1 = max(w[3] for w in line)
            
            for w in line:
                x0, y0, x1, y1, word = w[:5]
                word = clean_word_text(word)
                font, size, color = get_word_style(w, spans)
                line_fonts.append(font)
                line_sizes.append(size)
                line_colors.append(color)
                
                if prev_x1 is not None:
                    gap = x0 - prev_x1
                    space_count = int(gap / (size * 0.45))
                    if space_count > 0:
                        line_text.append("&nbsp;" * space_count)
                    else:
                        line_text.append(" ")
                line_text.append(word)
                prev_x1 = x1
                
            avg_size = sum(line_sizes) / len(line_sizes) if line_sizes else 12.0
            most_common_font = max(set(line_fonts), key=line_fonts.count) if line_fonts else "sans-serif"
            common_color_int = max(set(line_colors), key=line_colors.count) if line_colors else 0
            color_str = f"#{common_color_int:06x}" if isinstance(common_color_int, int) else str(common_color_int)
            
            raw_text = "".join(line_text)
            plain_text = raw_text.replace("&nbsp;", " ")
            
            # Save this line to TextBlock database
            block_id = TextBlockModel.create(
                pdf_id=pdf_id,
                page=page_num,
                text=plain_text,
                x=lx0,
                y=ly0,
                width=lx1 - lx0,
                height=ly1 - ly0,
                font=most_common_font,
                font_size=avg_size,
                color=color_str,
                rotation=0.0
            )
            
            styled_lines.append({
                "id": block_id,
                "y": ly0,
                "text": raw_text,
                "plain": plain_text,
                "font": most_common_font,
                "size": avg_size,
                "type": "text"
            })
            
        # Combine table HTML and lines by Y coordinate
        elements = []
        for sl in styled_lines:
            elements.append((sl["y"], "text", sl))
            
        for t in tables:
            rows = t.extract()
            html = "<div class='table-responsive'><table class='notes-table' style='width: 100%; border-collapse: collapse; margin: 24px 0; color: #ccc; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.08);'>"
            for r_idx, r in enumerate(rows):
                html += "<tr style='border-bottom: 1px solid rgba(255,255,255,0.08);'>"
                for val in r:
                    val = (val or "").strip().replace("\n", "<br>")
                    if r_idx == 0:
                        html += f"<th style='padding: 12px 16px; background: rgba(0, 191, 255, 0.08); color: #00bfff; font-weight: 600; text-align: left; border-right: 1px solid rgba(255,255,255,0.08);'>{val}</th>"
                    else:
                        html += f"<td style='padding: 12px 16px; border-right: 1px solid rgba(255,255,255,0.08);'>{val}</td>"
                html += "</tr>"
            html += "</table></div>"
            elements.append((t.bbox[1], "table", html))
            
        elements.sort(key=lambda x: x[0])
        
        # Build page HTML
        in_code_block = False
        code_lines = []
        
        def is_code_line(line_obj):
            text = line_obj["plain"].strip()
            if line_obj["size"] > 19:
                return False
            if re.match(r"^\d+\.\s*(#|=|\bprint\b|\bdef\b|\bif\b|\bfor\b)", text):
                return True
            if text.startswith("#") or text.startswith("print(") or (("=" in text) and not ("is used for" in text or "can be" in text or "once" in text.lower())):
                if ":" in text and not text.startswith("print("):
                    return False
                return True
            return False
            
        def is_diagram_line(line_obj):
            text = line_obj["plain"].strip()
            if not text:
                return False
            parts = re.split(r'\s+', text)
            if len(parts) > 3 and all(len(p) <= 2 or (p.startswith("-") and len(p) <= 3) for p in parts):
                return True
            return False
            
        for y, etype, content in elements:
            if etype == "table":
                if in_code_block:
                    full_html.append(f"<pre style='background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin: 16px 0; overflow-x: auto; font-family: monospace;'><code>{chr(10).join(code_lines)}</code></pre>")
                    code_lines = []
                    in_code_block = False
                full_html.append(content)
                continue
                
            line = content
            text = line["text"]
            plain = line["plain"].strip()
            
            if not plain:
                continue
                
            # Code block rendering
            if is_code_line(line) or (in_code_block and plain and not plain.startswith("Characteristics") and not plain.startswith("Example:") and not plain.startswith("String Method")):
                if not in_code_block:
                    in_code_block = True
                    code_lines = []
                code_lines.append(line["plain"])
                continue
            else:
                if in_code_block:
                    full_html.append(f"<pre style='background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin: 16px 0; overflow-x: auto; font-family: monospace;'><code>{chr(10).join(code_lines)}</code></pre>")
                    code_lines = []
                    in_code_block = False
                    
            if is_diagram_line(line):
                full_html.append(f"<pre class='diagram' style='font-family: monospace; background: rgba(0,0,0,0.25); padding: 10px 16px; border-radius: 6px; margin: 8px 0; overflow-x: auto; color: #5bdcae;'>{line['plain']}</pre>")
                continue
                
            # Headings
            if line["size"] > 21 or "bold" in line["font"].lower() or "extra" in line["font"].lower() or line["size"] > 18 and (line["y"] < 120 or plain.endswith("String")):
                if line["size"] > 24:
                    full_html.append(f"<h1 style='color: #fff; font-size: 28px; font-weight: 700; margin-top: 32px; margin-bottom: 16px;'>{plain}</h1>")
                elif line["size"] > 18:
                    full_html.append(f"<h2 style='color: #00bfff; font-size: 22px; font-weight: 600; margin-top: 24px; margin-bottom: 12px;'>{plain}</h2>")
                else:
                    full_html.append(f"<h3 style='color: #fff; font-size: 18px; font-weight: 600; margin-top: 20px; margin-bottom: 10px;'>{plain}</h3>")
                continue
                
            # Bullet lists
            if plain.startswith("•") or plain.startswith("-") or plain.startswith("*") or (plain.startswith("A ") and "string" in plain):
                bullet_text = plain.lstrip("•-* ").strip()
                if ":" in bullet_text:
                    parts = bullet_text.split(":", 1)
                    full_html.append(f"<p style='margin: 8px 0 8px 20px; color: #ccc; line-height: 1.6;'>• <strong style='color: #00bfff;'>{parts[0]}:</strong>{parts[1]}</p>")
                else:
                    full_html.append(f"<p style='margin: 8px 0 8px 20px; color: #ccc; line-height: 1.6;'>• {bullet_text}</p>")
                continue
                
            # Paragraph
            full_html.append(f"<p style='margin: 12px 0; color: #bbb; line-height: 1.65;'>{text}</p>")
            
        if in_code_block:
            full_html.append(f"<pre style='background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin: 16px 0; overflow-x: auto; font-family: monospace;'><code>{chr(10).join(code_lines)}</code></pre>")
            
    doc.close()
    return True, "\n".join(full_html)

def _run_ocr_placeholder(pdf_id: str, pdf_path: str) -> str:
    """
    OCR fallback — runs when PDF has no text layer.
    Returns HTML of extracted content, saves TextBlocks to DB.
    """
    logger.info(f"Running OCR on {pdf_id}...")
    blocks = run_ocr_on_pdf(pdf_id, pdf_path)
    if not blocks:
        return "<p>OCR could not extract any text from this PDF.</p>"

    # Save blocks to DB
    for b in blocks:
        TextBlockModel.create(
            pdf_id=b["pdf_id"],
            page=b["page"],
            text=b["text"],
            x=b["x"],
            y=b["y"],
            width=b["width"],
            height=b["height"],
            font=b["font"],
            font_size=b["font_size"],
            color=b["color"],
            rotation=b["rotation"]
        )

    # Group words by page and render basic HTML
    pages: dict[int, list[dict]] = {}
    for b in blocks:
        pages.setdefault(b["page"], []).append(b)

    html_parts = []
    for page_num in sorted(pages):
        words = sorted(pages[page_num], key=lambda w: (w["y"], w["x"]))
        current_y = None
        line_words = []
        lines = []

        for w in words:
            if current_y is None or abs(w["y"] - current_y) > 10:
                if line_words:
                    lines.append(line_words)
                line_words = [w]
                current_y = w["y"]
            else:
                line_words.append(w)
        if line_words:
            lines.append(line_words)

        for line in lines:
            text = " ".join(w["text"] for w in line)
            html_parts.append(f"<p style='margin: 10px 0; color: #bbb; line-height: 1.6;'>{text}</p>")

    return "\n".join(html_parts)
