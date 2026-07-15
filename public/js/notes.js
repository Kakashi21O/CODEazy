// public/js/notes.js
// Drives the three-view notes page: courses → subjects → notes viewer

let currentCourseId  = null;
let currentSubjectId = null;
let completedSet     = {}; // local cache of completed subject IDs

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadCompletedIfLoggedIn();
  await loadCourses();

  document.getElementById('notes-back-btn').addEventListener('click', () => {
    showSubjectView(currentCourseId);
  });
});

async function loadCompletedIfLoggedIn() {
  if (!Auth.isLoggedIn()) return;
  try {
    const { completed } = await Progress.get();
    completedSet = completed || {};
  } catch { /* ignore */ }
}

// ── View management ───────────────────────────────────────────────────────────
function showCourseView() {
  document.getElementById('course-view').style.display  = '';
  document.getElementById('subject-view').style.display = 'none';
  document.getElementById('notes-view').style.display   = 'none';
}

function showSubjectView(courseId) {
  document.getElementById('course-view').style.display  = 'none';
  document.getElementById('subject-view').style.display = '';
  document.getElementById('notes-view').style.display   = 'none';
  loadSubjects(courseId);
}

function showNotesView() {
  document.getElementById('course-view').style.display  = 'none';
  document.getElementById('subject-view').style.display = 'none';
  document.getElementById('notes-view').style.display   = '';
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
  } catch (err) {
    grid.innerHTML = `<p style="color:#ff8080">Failed to load courses. Is the server running?</p>`;
  }
}

// ── Subject list ──────────────────────────────────────────────────────────────
async function loadSubjects(courseId) {
  currentCourseId = courseId;
  const list = document.getElementById('subject-list');
  list.innerHTML = '<div class="skeleton" style="height:70px;border-radius:12px;"></div>'.repeat(5);

  try {
    const course   = await Courses.getById(courseId);
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
  } catch (err) {
    list.innerHTML = `<p style="color:#ff8080">Failed to load topics.</p>`;
  }
}

// ── Notes viewer ──────────────────────────────────────────────────────────────
async function openSubject(subjectId) {
  currentSubjectId = subjectId;
  showNotesView();

  document.getElementById('nv-title').textContent   = 'Loading…';
  document.getElementById('nv-content').textContent = '';

  try {
    const subject = await Courses.getSubject(subjectId);
    document.getElementById('nv-title').textContent = subject.title;

    // Render notes — parse backtick code blocks into <pre><code>
    document.getElementById('nv-content').innerHTML = renderNotes(subject.notes);

    // Update complete button state
    updateCompleteBtn();
  } catch (err) {
    document.getElementById('nv-content').textContent = 'Failed to load notes.';
  }
}

/** Simple renderer: turns ```lang\n...\n``` blocks into <pre><code> */
function renderNotes(text) {
  if (!text) return '';
  // Escape HTML
  const escape = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Replace ```...``` blocks
  let html = escape(text).replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => `<pre><code class="lang-${lang}">${code}</code></pre>`
  );

  // Inline `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Paragraphs — split on double newline
  html = html.split(/\n\n+/).map(p => {
    if (p.startsWith('<pre>')) return p;
    return p.replace(/\n/g, '<br>');
  }).join('\n\n');

  return html;
}

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
  if (!Auth.isLoggedIn()) {
    window.location.href = '/login.html';
    return;
  }
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
    // Also refresh the subject item's completed class if it's still in DOM
    const item = document.getElementById(`si-${currentSubjectId}`);
    if (item) {
      item.classList.toggle('completed', !done);
      item.querySelector('.subject-check').textContent = !done ? '✓' : '';
    }
  } catch (err) {
    alert('Could not update progress. Please try again.');
  }
}
