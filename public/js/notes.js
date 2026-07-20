// public/js/notes.js
// Drives the three-view notes page: courses → subjects → notes viewer

let currentCourseId  = null;
let currentSubjectId = null;
let completedSet     = {};
let saveTimeout      = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  showCourseView(); // hide all views except course grid on load

  await loadCompletedIfLoggedIn();
  await loadCourses();

  const courseParam = new URLSearchParams(window.location.search).get('course');
  if (courseParam) showSubjectView(courseParam);

  document.getElementById('notes-back-btn').addEventListener('click', () => {
    showSubjectView(currentCourseId);
  });

  // Auto-save on input — only teachers/admins have contentEditable=true so students can't trigger this
  document.getElementById('nv-content').addEventListener('input', () => {
    showSaveStatus('Saving…', '#aaa', 'rgba(255,255,255,0.08)');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await NotesUpload.update(currentCourseId, currentSubjectId, document.getElementById('nv-content').innerHTML);
        showSaveStatus('✓ Saved', '#5bdcae', 'rgba(91,220,174,0.12)', 2500);
      } catch {
        showSaveStatus('✗ Save failed', '#ff8080', 'rgba(255,128,128,0.12)');
      }
    }, 1000);
  });

});

function showSaveStatus(text, color, bg, autohideMs = 0) {
  const el = document.getElementById('nv-save-status');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
  el.style.background = bg;
  el.style.display = 'inline-block';
  if (autohideMs) setTimeout(() => { el.style.display = 'none'; }, autohideMs);
}

async function loadCompletedIfLoggedIn() {
  if (!Auth.isLoggedIn()) return;
  try {
    const { completed } = await Progress.get();
    completedSet = completed || {};
  } catch { /* ignore */ }
}

// ── View management ───────────────────────────────────────────────────────────
function showCourseView() {
  document.getElementById('course-view').style.display  = 'block';
  document.getElementById('subject-view').style.display = 'none';
  document.getElementById('notes-view').style.display   = 'none';
}

function showSubjectView(courseId) {
  document.getElementById('course-view').style.display  = 'none';
  document.getElementById('subject-view').style.display = 'block';
  document.getElementById('notes-view').style.display   = 'none';
  loadSubjects(courseId);
}

function showNotesView() {
  document.getElementById('course-view').style.display  = 'none';
  document.getElementById('subject-view').style.display = 'none';
  document.getElementById('notes-view').style.display   = 'block';
}

// ── Course grid ───────────────────────────────────────────────────────────────
async function loadCourses() {
  const grid = document.getElementById('course-grid');
  try {
    const courses = await Courses.getAll();
    grid.innerHTML = courses.map(c => `
      <div class="course-card" style="--course-color:${c.color}" onclick="showSubjectView('${c.id}')">
        <span class="course-icon">${c.icon}</span>
        <div class="course-title">${c.title}</div>
        <div class="course-desc">${c.description}</div>
        <div class="course-meta">
          <span class="course-level">${c.level}</span>
          <span class="course-count">${c.subjectCount} topics</span>
        </div>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = `<p style="color:#ff8080">Failed to load courses. Is the server running?</p>`;
  }
}

// ── Subject list ──────────────────────────────────────────────────────────────
async function loadSubjects(courseId) {
  currentCourseId = courseId;
  const list = document.getElementById('subject-list');
  list.innerHTML = '<div class="skeleton" style="height:70px;border-radius:12px;"></div>'.repeat(5);

  try {
    const course = await Courses.getById(courseId);
    document.getElementById('sv-title').textContent = course.title;
    document.getElementById('sv-desc').textContent  = course.description;

    list.innerHTML = course.subjects.map(s => {
      const done = !!completedSet[s.id];
      return `
        <div class="subject-item ${done ? 'completed' : ''}" id="si-${s.id}" onclick="openSubject('${s.id}')">
          <div class="subject-check">${done ? '✓' : ''}</div>
          <div class="subject-info">
            <div class="subject-name">${s.title}</div>
            <div class="subject-duration">⏱ ${s.duration}</div>
          </div>
          <span class="subject-arrow">›</span>
        </div>
      `;
    }).join('');
  } catch {
    list.innerHTML = `<p style="color:#ff8080">Failed to load topics.</p>`;
  }
}

// ── Notes viewer ──────────────────────────────────────────────────────────────
async function openSubject(subjectId) {
  currentSubjectId = subjectId;
  showNotesView();

  const content    = document.getElementById('nv-content');
  const saveStatus = document.getElementById('nv-save-status');

  // Reset
  document.getElementById('nv-title').textContent = 'Loading…';
  document.getElementById('nv-pdf-btn').style.display = 'none';
  document.getElementById('view-toggle').style.display = 'none';
  content.innerHTML = '';
  content.contentEditable = 'false';
  if (saveStatus) saveStatus.style.display = 'none';

  try {
    const subject = await Courses.getSubject(subjectId);
    document.getElementById('nv-title').textContent = subject.title;

    if (subject.pdf_url) {
      const pdfBtn = document.getElementById('nv-pdf-btn');
      pdfBtn.href = subject.pdf_url;
      pdfBtn.style.display = 'inline-block';
    }

    // Render content first
    content.innerHTML = renderNotes(subject.notes, !!subject.pdf_url);
    updateCompleteBtn();

    // Set edit permissions
    const u = Auth.getUser();
    const isEditor = u && (u.role === 'teacher' || u.role === 'admin');
    content.contentEditable = isEditor ? 'true' : 'false';

    // PDF toggle
    if (subject.pdf_url) {
      document.getElementById('view-toggle').style.display = 'inline-flex';
      switchView('pdf');
      PDFViewer.load('pdf-canvas-container', subject.pdf_url, subject.id);
    }
  } catch (err) {
    content.textContent = 'Failed to load notes.';
    console.error(err);
  }
}

// ── Notes renderer ────────────────────────────────────────────────────────────
function renderNotes(text, isHtml = false) {
  if (!text) return '';
  if (isHtml) return text;

  const escape = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const codeBlocks = [];
  let working = escape(text).replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const token = `@@CODE${codeBlocks.length}@@`;
    codeBlocks.push(`<pre><code class="lang-${lang}">${code}</code></pre>`);
    return token;
  });
  working = working.replace(/`([^`]+)`/g, '<code>$1</code>');
  let html = working.split(/\n\n+/).map(p =>
    /^@@CODE\d+@@$/.test(p.trim()) ? p.trim() : p.replace(/\n/g, '<br>')
  ).join('\n\n');
  html = html.replace(/@@CODE(\d+)@@/g, (_, i) => codeBlocks[Number(i)]);
  return html;
}

// ── PDF View toggle ───────────────────────────────────────────────────────────
function switchView(mode) {
  const htmlArea = document.getElementById('nv-content');
  const pdfArea  = document.getElementById('pdf-viewer-area');
  const btnHtml  = document.getElementById('toggle-html');
  const btnPdf   = document.getElementById('toggle-pdf');

  if (mode === 'pdf') {
    htmlArea.style.display = 'none';
    pdfArea.style.display  = 'block';
    btnPdf.classList.add('active');
    btnHtml.classList.remove('active');
  } else {
    pdfArea.style.display  = 'none';
    htmlArea.style.display = 'block';
    btnHtml.classList.add('active');
    btnPdf.classList.remove('active');
  }
}

function updateZoomLabel() {
  const label = document.getElementById('zoom-label');
  if (label) label.textContent = Math.round(PDFViewer.getScale() * 100) + '%';
}

// ── Complete tracking ─────────────────────────────────────────────────────────
function updateCompleteBtn() {
  const btn  = document.getElementById('complete-btn');
  const done = !!completedSet[currentSubjectId];
  if (!Auth.isLoggedIn()) {
    btn.textContent = 'Login to track progress';
    btn.className   = 'complete-btn';
    return;
  }
  btn.textContent = done ? '✓ Completed' : 'Mark Complete';
  btn.className   = done ? 'complete-btn done' : 'complete-btn';
}

async function toggleComplete() {
  if (!Auth.isLoggedIn()) { window.location.href = '/login.html'; return; }
  const done = !!completedSet[currentSubjectId];
  try {
    if (done) {
      await Progress.markIncomplete(currentSubjectId);
      delete completedSet[currentSubjectId];
    } else {
      await Progress.markComplete(currentSubjectId);
      completedSet[currentSubjectId] = { completedAt: new Date().toISOString() };
    }
    updateCompleteBtn();
    const item = document.getElementById(`si-${currentSubjectId}`);
    if (item) {
      item.classList.toggle('completed', !done);
      item.querySelector('.subject-check').textContent = !done ? '✓' : '';
    }
  } catch {
    alert('Could not update progress. Please try again.');
  }
}
