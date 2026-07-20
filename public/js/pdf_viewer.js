// public/js/pdf_viewer.js
// PDF viewer with text-block overlay; teachers can edit blocks directly.

const PDFViewer = (() => {
  let _pdfDoc    = null;
  let _scale     = 1.5;
  let _container = null;
  let _blocks    = [];

  async function load(containerId, pdfUrl, subjectId) {
    _container = document.getElementById(containerId);
    if (!_container) return;
    _container.innerHTML = '<div class="pdf-loading">Loading PDF…</div>';

    const [, pdfDoc] = await Promise.all([
      _loadBlocks(subjectId),
      _loadPDF(pdfUrl),
    ]);

    _pdfDoc = pdfDoc;
    await _renderAll();
  }

  function setScale(newScale) {
    _scale = Math.min(3, Math.max(0.5, newScale));
    _rerenderAll();
  }

  function getScale() { return _scale; }

  async function _loadBlocks(subjectId) {
    try {
      const res = await fetch(`/api/blocks/${subjectId}`);
      if (res.ok) _blocks = await res.json();
      else _blocks = [];
    } catch { _blocks = []; }
  }

  async function _loadPDF(url) {
    const loadingTask = pdfjsLib.getDocument(url);
    return loadingTask.promise;
  }

  async function _renderAll() {
    _container.innerHTML = '';
    for (let pageNum = 1; pageNum <= _pdfDoc.numPages; pageNum++) {
      const page   = await _pdfDoc.getPage(pageNum);
      const pageEl = await _renderPage(page, pageNum);
      _container.appendChild(pageEl);
    }
  }

  async function _renderPage(page, pageNum) {
    const viewport = page.getViewport({ scale: _scale });

    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-page-container';
    wrapper.style.width  = viewport.width + 'px';
    wrapper.style.height = viewport.height + 'px';

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page-canvas';
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    wrapper.appendChild(canvas);

    const overlay = document.createElement('div');
    overlay.className = 'pdf-text-overlay';
    _placeBlocks(overlay, pageNum - 1, viewport);
    wrapper.appendChild(overlay);

    return wrapper;
  }

  function _placeBlocks(overlay, pageIndex, viewport) {
    const pageBlocks = _blocks.filter(b => b.page === pageIndex);
    const u = Auth.getUser();
    const isTeacher = u && (u.role === 'teacher' || u.role === 'admin');

    pageBlocks.forEach(b => {
      const span = document.createElement('span');
      span.className       = 'pdf-text-block';
      span.dataset.blockId = b.id;
      span.dataset.text    = b.text;
      span.textContent     = b.text;

      span.style.left     = (b.x * _scale) + 'px';
      span.style.top      = (b.y * _scale) + 'px';
      span.style.width    = (b.width  * _scale) + 'px';
      span.style.height   = (b.height * _scale) + 'px';
      span.style.fontSize = (b.font_size * _scale) + 'px';

      if (isTeacher) {
        span.style.cursor = 'text';
        span.addEventListener('click', () => _openDirectEdit(span, b));
      }

      overlay.appendChild(span);
    });
  }

  function _openDirectEdit(span, block) {
    if (span.isEditing) return;

    span.isEditing = true;
    span.contentEditable = 'true';
    span.style.color = '#111';
    span.style.background = '#fff';
    span.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    span.style.outline = '2px solid #00bfff';
    span.style.zIndex = '100';
    span.style.cursor = 'text';
    span.style.minWidth = span.style.width;
    span.style.width = 'auto';
    span.style.whiteSpace = 'nowrap';
    span.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(range);

    const saveEdit = async () => {
      if (!span.isEditing) return;
      span.isEditing = false;
      span.contentEditable = 'false';
      span.style.color = 'transparent';
      span.style.background = '';
      span.style.boxShadow = 'none';
      span.style.outline = 'none';
      span.style.zIndex = '';
      span.style.width = (block.width * _scale) + 'px';

      const newText = span.textContent.trim();
      if (!newText || newText === block.text) {
        span.textContent = block.text;
        return;
      }

      span.style.background = 'rgba(0,191,255,0.2)';

      try {
        const token = localStorage.getItem('ce_token');
        const res = await fetch(`/api/blocks/${block.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ new_text: newText }),
        });
        if (!res.ok) throw new Error('Failed to update block');

        block.text = newText;
        span.dataset.text = newText;
        span.style.background = '';
      } catch (e) {
        alert('Failed to save: ' + e.message);
        span.textContent = block.text;
        span.style.background = '';
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        span.blur();
      } else if (e.key === 'Escape') {
        span.textContent = block.text;
        span.blur();
      }
    };

    span.addEventListener('blur', saveEdit, { once: true });
    span.addEventListener('keydown', handleKeyDown);
  }

  async function _rerenderAll() {
    if (!_pdfDoc || !_container) return;
    await _renderAll();
  }

  return { load, setScale, getScale };
})();
