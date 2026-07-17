// public/js/nav.js
// Shared nav state — call initNav() on every page to update header based on auth state.

function initNav() {
  const loginBtn = document.getElementById('nav-login-btn');
  const userMenu = document.getElementById('nav-user-menu');

  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    const firstName = user?.name?.split(' ')[0] || 'User';
    const initial   = firstName[0].toUpperCase();
    const role      = user?.role || 'student';

    if (loginBtn) loginBtn.style.display = 'none';

    if (userMenu) {
      userMenu.style.display = 'flex';
      userMenu.style.alignItems = 'center';

      // Inject avatar + dropdown (only once)
      userMenu.innerHTML = `
        <div class="nav-avatar-wrap">
          <button class="nav-avatar" id="nav-avatar-btn" aria-label="User menu">${initial}</button>
          <div class="nav-dropdown" id="nav-dropdown">
            <div class="nav-dropdown-header">
              <div class="nav-dropdown-avatar">${initial}</div>
              <div>
                <div class="nav-dropdown-name">${user?.name || 'User'}</div>
                <div class="nav-dropdown-role">${role.charAt(0).toUpperCase() + role.slice(1)}</div>
              </div>
            </div>
            <div class="nav-dropdown-divider"></div>
            <a href="/dashboard.html" class="nav-dropdown-item">📊 Dashboard</a>
            <a href="/settings.html" class="nav-dropdown-item">⚙️ Settings</a>
            ${role === 'admin' || role === 'teacher' ? '<a href="/admin.html" class="nav-dropdown-item">🛡️ Admin Panel</a>' : ''}
            <div class="nav-dropdown-divider"></div>
            <button class="nav-dropdown-item nav-dropdown-logout" id="nav-logout-btn">🚪 Logout</button>
          </div>
        </div>
      `;

      // Toggle dropdown
      document.getElementById('nav-avatar-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('nav-dropdown').classList.toggle('open');
      });

      // Close on outside click
      document.addEventListener('click', () => {
        const dd = document.getElementById('nav-dropdown');
        if (dd) dd.classList.remove('open');
      });

      // Logout
      document.getElementById('nav-logout-btn').addEventListener('click', () => {
        Auth.clearSession();
        window.location.href = '/home.html';
      });
    }

  } else {
    if (loginBtn)  loginBtn.style.display = '';
    if (userMenu)  userMenu.style.display  = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initNav);
