// public/js/pdf_viewer.js
// PART 4+5 — PDF Viewer with Suggest Mode for students.

const PDFViewer = (() => {
  let _pdfDoc      = null;
  let _scale       = 1.5;
  let _container   = null;
  let _blocks      = [];
  let _suggestMode = false;
  let _pending     = {}; // blockId -> true if suggestion submitted this session
  let _teacherSuggestions = {}; // blockId -> suggestion object

  // ── Public API ──────────────────────────────────────────────────────────────
  async function load(containerId, pdfUrl, subjectId) {
    _container = document.getElementById(containerId);
    if (!_container) return;
    _pending = {};
    _container.innerHTML = '<div class="pdf-loading">Loading PDF…</div>';

    // Load text blocks and PDF simultaneously
    const [, pdfDoc] = await Promise.all([
      _loadBlocksAndSuggestions(subjectId),
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

  function setSuggestMode(enabled) {
    _suggestMode = enabled;
    // Update cursor on all blocks
    document.querySelectorAll('.pdf-text-block').forEach(el => {
      el.style.cursor = enabled ? 'text' : 'default';
    });
  }

  // ── Internal ────────────────────────────────────────────────────────────────
  async function _loadBlocksAndSuggestions(subjectId) {
    try {
      const res = await fetch(`/api/blocks/${subjectId}`);
      if (res.ok) _blocks = await res.json();
      else _blocks = [];
    } catch { _blocks = []; }

    const u = Auth.getUser();
    if (u && (u.role === 'teacher' || u.role === 'admin')) {
      try {
        const token = localStorage.getItem('ce_token');
        const res = await fetch(`/api/suggestions/pdf/${subjectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const sug = await res.json();
          _teacherSuggestions = {};
          sug.forEach(s => _teacherSuggestions[s.block_id] = s);
        }
      } catch { _teacherSuggestions = {}; }
    }
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
    const pageBlocks    = _blocks.filter(b => b.page === pageIndex);
    const pdfPageHeight = viewport.height / _scale;

    pageBlocks.forEach(b => {
      const span = document.createElement('span');
      span.className       = 'pdf-text-block';
      span.dataset.blockId = b.id;
      span.dataset.text    = b.text;
      span.textContent     = b.text;

      const left   = b.x * _scale;
      const top    = b.y * _scale;

      span.style.left     = left + 'px';
      span.style.top      = top  + 'px';
      span.style.width    = (b.width  * _scale) + 'px';
      span.style.height   = (b.height * _scale) + 'px';
      span.style.fontSize = (b.font_size * _scale) + 'px';

      const u = Auth.getUser();
      const isTeacher = u && (u.role === 'teacher' || u.role === 'admin');

      if (isTeacher) {
        span.style.cursor = 'text';
      }

      // If already submitted this session, show badge
      if (_pending[b.id]) {
        _markPending(span, 'Pending');
      } else if (_teacherSuggestions[b.id]) {
        _markPending(span, 'Review Edit', '#ffb020', 'rgba(255, 176, 32, 0.12)');
      }

      span.addEventListener('click', () => {
        if (isTeacher) {
          if (_teacherSuggestions[b.id]) {
            _openReviewPopover(span, b, _teacherSuggestions[b.id]);
          } else {
            _openDirectEditPopover(span, b);
          }
        } else {
          _onBlockClick(span, b);
        }
      });
      overlay.appendChild(span);
    });
  }

  function _onBlockClick(span, block) {
    if (!_suggestMode) return;
    if (_pending[block.id]) return; // already submitted
    _openSuggestPopover(span, block);
  }

  function _openSuggestPopover(span, block) {
    // Remove any existing popover
    document.querySelectorAll('.suggest-popover').forEach(p => p.remove());

    const popover = document.createElement('div');
    popover.className = 'suggest-popover';
    popover.innerHTML = `
      <div class="suggest-popover-header">
        <span>Suggest Edit</span>
        <button class="suggest-close" onclick="this.closest('.suggest-popover').remove()">✕</button>
      </div>
      <div class="suggest-label">Original:</div>
      <div class="suggest-original">${_escHtml(block.text)}</div>
      <div class="suggest-label">Your suggestion:</div>
      <textarea class="suggest-input" rows="3">${_escHtml(block.text)}</textarea>
      <div class="suggest-actions">
        <button class="suggest-cancel" onclick="this.closest('.suggest-popover').remove()">Cancel</button>
        <button class="suggest-submit">Submit</button>
      </div>
      <div class="suggest-msg" style="display:none;"></div>
    `;

    // Position popover relative to span
    const rect = span.getBoundingClientRect();
    const containerRect = _container.getBoundingClientRect();
    popover.style.left = Math.min(rect.left - containerRect.left, containerRect.width - 340) + 'px';
    popover.style.top  = (rect.bottom - containerRect.top + 8) + 'px';
    _container.style.position = 'relative';
    _container.appendChild(popover);

    // Submit handler
    popover.querySelector('.suggest-submit').addEventListener('click', async () => {
      const newText = popover.querySelector('.suggest-input').value.trim();
      const msg     = popover.querySelector('.suggest-msg');
      const btn     = popover.querySelector('.suggest-submit');

      if (!newText || newText === block.text) {
        msg.textContent = 'Please enter a different suggestion.';
        msg.style.display = 'block';
        msg.style.color = '#ff8080';
        return;
      }

      btn.disabled     = true;
      btn.textContent  = 'Submitting…';

      try {
        const token = localStorage.getItem('ce_token');
        const res   = await fetch('/api/suggestions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body:    JSON.stringify({ block_id: block.id, old_text: block.text, new_text: newText }),
        });

        if (!res.ok) throw new Error((await res.json()).detail || 'Failed');

        _pending[block.id] = true;
        _markPending(span);
        popover.remove();
      } catch (err) {
        msg.textContent   = err.message;
        msg.style.display = 'block';
        msg.style.color   = '#ff8080';
        btn.disabled      = false;
        btn.textContent   = 'Submit';
      }
    });
  }

  function _openReviewPopover(span, block, suggestion) {
    document.querySelectorAll('.suggest-popover').forEach(p => p.remove());

    const popover = document.createElement('div');
    popover.className = 'suggest-popover';
    popover.innerHTML = `
      <div class="suggest-popover-header">
        <span>Review Suggestion</span>
        <button class="suggest-close" onclick="this.closest('.suggest-popover').remove()">✕</button>
      </div>
      <div class="suggest-label">Original:</div>
      <div class="suggest-original">${_escHtml(block.text)}</div>
      <div class="suggest-label">Suggested Edit:</div>
      <div class="suggest-original" style="border-color: rgba(91, 220, 174, 0.5); color: #5bdcae;">${_escHtml(suggestion.new_text)}</div>
      <div class="suggest-actions">
        <button class="suggest-cancel" id="btn-reject" style="color: #ff8080; border: 1px solid rgba(255,128,128,0.2);">Reject</button>
        <button class="suggest-submit" id="btn-accept" style="background: linear-gradient(135deg, #5bdcae, #3cb085);">Accept</button>
      </div>
      <div class="suggest-msg" style="display:none;"></div>
    `;

    _positionPopover(popover, span);

    popover.querySelector('#btn-accept').addEventListener('click', async () => {
      await _handleReviewAction(popover, suggestion.id, 'accepted', suggestion.new_text, span, block);
    });
    popover.querySelector('#btn-reject').addEventListener('click', async () => {
      await _handleReviewAction(popover, suggestion.id, 'rejected', null, span, block);
    });
  }

  async function _handleReviewAction(popover, suggId, status, newText, span, block) {
    const msg = popover.querySelector('.suggest-msg');
    const btns = popover.querySelectorAll('button');
    btns.forEach(b => b.disabled = true);

    try {
      const token = localStorage.getItem('ce_token');
      const res = await fetch(`/api/suggestions/${suggId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status, reason: '' })
      });
      if (!res.ok) throw new Error('Failed to update suggestion');

      if (status === 'accepted') {
        block.text = newText;
        span.textContent = newText;
        span.dataset.text = newText;
      }
      
      delete _teacherSuggestions[block.id];
      span.classList.remove('pdf-block-pending');
      const badge = span.querySelector('.pending-badge');
      if (badge) badge.remove();
      span.style.background = '';
      span.style.border = '';
      
      popover.remove();
    } catch (e) {
      msg.textContent = e.message;
      msg.style.display = 'block';
      btns.forEach(b => b.disabled = false);
    }
  }

  function _openDirectEditPopover(span, block) {
    if (span.isEditing) return;
    
    // Remove any existing popovers
    document.querySelectorAll('.suggest-popover').forEach(p => p.remove());

    span.isEditing = true;
    span.contentEditable = "true";
    
    // Make it look like an active text input covering the canvas text
    span.style.color = "#111"; 
    span.style.background = "#fff";
    span.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    span.style.outline = "2px solid #00bfff";
    span.style.zIndex = "100";
    span.style.cursor = "text";
    
    // Ensure it's wide enough if the text is short
    span.style.minWidth = span.style.width;
    span.style.width = "auto";
    span.style.whiteSpace = "nowrap";

    span.focus();

    // Select all text
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(range);

    const saveEdit = async () => {
      if (!span.isEditing) return;
      span.isEditing = false;
      span.contentEditable = "false";
      
      // Revert styles to transparent overlay
      span.style.color = "transparent";
      span.style.background = "";
      span.style.boxShadow = "none";
      span.style.outline = "none";
      span.style.zIndex = "";
      span.style.width = (block.width * _scale) + "px"; // restore fixed width
      
      const newText = span.textContent.trim();
      if (!newText || newText === block.text) {
        span.textContent = block.text; // revert
        return;
      }

      span.style.background = "rgba(0,191,255,0.2)"; // saving indicator
      
      try {
        const token = localStorage.getItem('ce_token');
        const res = await fetch(`/api/blocks/${block.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ new_text: newText })
        });
        if (!res.ok) throw new Error('Failed to update block');

        block.text = newText;
        span.dataset.text = newText;
        span.style.background = ""; // success
      } catch (e) {
        alert("Failed to save: " + e.message);
        span.textContent = block.text; // revert
        span.style.background = "";
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

  function _positionPopover(popover, span) {
    const rect = span.getBoundingClientRect();
    const containerRect = _container.getBoundingClientRect();
    popover.style.left = Math.min(rect.left - containerRect.left, containerRect.width - 340) + 'px';
    popover.style.top  = (rect.bottom - containerRect.top + 8) + 'px';
    _container.style.position = 'relative';
    _container.appendChild(popover);
  }

  function _markPending(span, text = 'Pending', badgeColor = '#5bdcae', bgColor = 'rgba(91, 220, 174, 0.12)') {
    span.classList.add('pdf-block-pending');
    span.style.background = bgColor;
    // Add a small badge if not already present
    if (!span.querySelector('.pending-badge')) {
      const badge = document.createElement('span');
      badge.className   = 'pending-badge';
      badge.textContent = text;
      badge.style.background = badgeColor;
      span.appendChild(badge);
    }
  }

  function _escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function _rerenderAll() {
    if (!_pdfDoc || !_container) return;
    await _renderAll();
  }

  return { load, setScale, getScale, setSuggestMode };
})();
