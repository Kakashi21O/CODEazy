// public/js/suggestions.js

let _coursesDict = {};
let _suggestionsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadCoursesDict();
  await loadSuggestions();
});

async function loadCoursesDict() {
  try {
    const courses = await Courses.getAll();
    for (const c of courses) {
      _coursesDict[c.id] = { title: c.title, subjects: {} };
      try {
        const subjects = await Courses.getSubjects(c.id);
        for (const s of subjects) {
          _coursesDict[c.id].subjects[s.id] = s.title;
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.error("Failed to load courses dictionary");
  }
}

async function loadSuggestions() {
  const listEl = document.getElementById('suggestions-list');
  const emptyEl = document.getElementById('suggestions-empty');
  const loadEl = document.getElementById('suggestions-loading');
  
  loadEl.style.display = 'block';
  listEl.querySelectorAll('.suggestion-card').forEach(el => el.remove());
  emptyEl.style.display = 'none';

  try {
    const suggestions = await apiFetch('/suggestions', {}, true);
    _suggestionsList = suggestions;
    loadEl.style.display = 'none';
    
    if (!suggestions || suggestions.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    suggestions.forEach(s => {
      const card = document.createElement('div');
      card.className = 'suggestion-card';
      card.id = `suggestion-${s.id}`;
      
      const courseTitle = _coursesDict[s.course_id]?.title || s.course_id;
      const subjectTitle = _coursesDict[s.course_id]?.subjects[s.subject_id] || s.subject_id;
      
      const contextType = s.pdf_id ? 'PDF Text Block' : 'HTML Note';
      const studentList = s.student_names.join(', ');
      // The UI shows at most two names plus '...' if more
      let displayNames = s.student_names.slice(0, 2).join(', ');
      if (s.student_names.length > 2) {
          displayNames += ' ...';
      }

      card.innerHTML = `
        <div class="suggestion-context">
          <strong>${courseTitle}</strong> &gt; ${subjectTitle} &gt; ${contextType}
        </div>
        <div class="suggestion-text-diff">
          <div class="text-original" style="position:relative; padding-right:110px;" title="Original Text">
             ${escapeHtml(stripHtml(s.original_text))}
             <button style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:var(--bg-elevated); border:1px solid var(--border-color); color:var(--text-primary); padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;" onclick="viewContext('${s.id}', '${s.course_id}', '${s.subject_id}')">View Context</button>
          </div>
          <div style="text-align: center; color: var(--text-muted);">↓</div>
          <div class="text-new" style="position:relative; padding-right:80px;" title="Suggested Text">
             ${escapeHtml(stripHtml(s.replacement_text))}
             <div style="position:absolute; right:12px; top:50%; transform:translateY(-50%); display:flex; gap:8px;">
               <button onclick="handleSuggestion('${s.id}', 'approve')" style="background:transparent; border:none; cursor:pointer; font-size:20px;" title="Approve">✅</button>
               <button onclick="handleSuggestion('${s.id}', 'reject')" style="background:transparent; border:none; cursor:pointer; font-size:20px;" title="Reject">❌</button>
             </div>
          </div>
        </div>
        <div class="suggestion-students" style="margin-bottom:0;">
          Suggested by: <strong>${escapeHtml(displayNames)}</strong>
        </div>
      `;
      listEl.appendChild(card);
    });

  } catch (e) {
    loadEl.style.display = 'none';
    alert("Failed to load suggestions: " + e.message);
  }
}

async function handleSuggestion(id, action) {
  try {
    await apiFetch(`/suggestions/${id}/${action}`, { method: 'POST' }, true);
    const card = document.getElementById(`suggestion-${id}`);
    if (card) {
      card.style.opacity = '0.5';
      card.style.pointerEvents = 'none';
      setTimeout(() => {
        card.remove();
        if (document.querySelectorAll('.suggestion-card').length === 0) {
          document.getElementById('suggestions-empty').style.display = 'block';
        }
      }, 500);
    }
  } catch (e) {
    alert(`Failed to ${action} suggestion: ${e.message}`);
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

async function viewContext(suggestionId, courseId, subjectId) {
  try {
    const subject = await Courses.getSubject(subjectId);
    let html = subject.notes || '';
    
    const s = _suggestionsList.find(x => x.id === suggestionId);
    if (s && s.original_text) {
      const highlightedText = `<span id="highlighted-suggestion" style="background-color: rgba(239, 68, 68, 0.3); outline: 2px solid #ef4444; border-radius: 4px;">${s.original_text}</span>`;
      html = html.replace(s.original_text, highlightedText);
    }

    document.getElementById('context-content').innerHTML = html;
    document.getElementById('notes-context-panel').style.display = 'block';
    
    setTimeout(() => {
      const mark = document.getElementById('highlighted-suggestion');
      if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

  } catch (e) {
    alert("Failed to load context: " + e.message);
  }
}
