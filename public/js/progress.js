// public/js/progress.js
// Renders the full dashboard page content based on auth + progress API

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('dashboard-container');

  if (!Auth.isLoggedIn()) {
    container.innerHTML = `
      <div class="auth-guard">
        <h2>You need to be logged in</h2>
        <p>Create a free account to track your progress across all courses.</p>
        <a href="/login.html">Get Started Free →</a>
      </div>`;
    return;
  }

  // Skeleton while loading
  container.innerHTML = `
    <div style="height:80px;border-radius:12px;" class="skeleton" style="margin-bottom:24px;"></div>
    <div class="stats-strip">${'<div class="skeleton" style="height:90px;"></div>'.repeat(3)}</div>
    <div class="progress-grid">${'<div class="skeleton" style="height:140px;"></div>'.repeat(5)}</div>
  `;

  try {
    const [{ summary }, user] = await Promise.all([
      Progress.get(),
      Auth.me().then(r => r.user),
    ]);

    const totalSubjects   = summary.reduce((a, c) => a + c.totalSubjects, 0);
    const totalCompleted  = summary.reduce((a, c) => a + c.completedSubjects, 0);
    const overallPercent  = totalSubjects ? Math.round((totalCompleted / totalSubjects) * 100) : 0;
    const inProgressCount = summary.filter(c => c.completedSubjects > 0 && c.completedSubjects < c.totalSubjects).length;

    container.innerHTML = `
      <!-- Welcome banner -->
      <div class="dash-welcome" style="animation:fadeUp .4s ease both">
        <div>
          <p class="dash-greet">Welcome back</p>
          <h1 class="dash-name">${user.name}</h1>
          <p class="dash-sub">Keep up the momentum — you're ${overallPercent}% through the curriculum.</p>
        </div>
        <a href="/notes.html" class="dash-action">📚 Continue Learning →</a>
      </div>

      <!-- Stats strip -->
      <div class="stats-strip" style="animation:fadeUp .4s .1s ease both">
        <div class="stat-pill">
          <span class="stat-pill-val">${overallPercent}%</span>
          <div class="stat-pill-lbl">Overall Progress</div>
        </div>
        <div class="stat-pill">
          <span class="stat-pill-val">${totalCompleted}</span>
          <div class="stat-pill-lbl">Topics Done</div>
        </div>
        <div class="stat-pill">
          <span class="stat-pill-val">${totalSubjects - totalCompleted}</span>
          <div class="stat-pill-lbl">Topics Left</div>
        </div>
        <div class="stat-pill">
          <span class="stat-pill-val">${inProgressCount}</span>
          <div class="stat-pill-lbl">In Progress</div>
        </div>
      </div>

      <!-- Per-course cards -->
      <h2 class="dash-section-title">Course Progress</h2>
      <div class="progress-grid">
        ${summary.map((c, i) => `
          <a href="/notes.html" class="progress-card" style="animation:fadeUp .4s ${0.15 + i * 0.06}s ease both">
            <div class="pc-header">
              <span class="pc-icon">${c.icon}</span>
              <div>
                <div class="pc-title">${c.courseTitle}</div>
                <div class="pc-count">${c.completedSubjects} / ${c.totalSubjects} topics</div>
              </div>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width:${c.percent}%"></div>
            </div>
            <span class="pc-percent">${c.percent}% complete</span>
          </a>
        `).join('')}
      </div>
    `;

    // Trigger CSS width transition after DOM paint
    requestAnimationFrame(() => {
      document.querySelectorAll('.progress-bar-fill').forEach(bar => {
        const w = bar.style.width;
        bar.style.width = '0%';
        requestAnimationFrame(() => { bar.style.width = w; });
      });
    });

  } catch (err) {
    container.innerHTML = `<p style="color:#ff8080; text-align:center; margin-top:60px;">Failed to load dashboard. Is the server running?</p>`;
  }
});
