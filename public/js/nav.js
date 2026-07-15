// public/js/nav.js
// Shared nav state — call initNav() on every page to update header based on auth state.

function initNav() {
  const loginBtn = document.getElementById('nav-login-btn');
  const userMenu = document.getElementById('nav-user-menu');
  const userName = document.getElementById('nav-user-name');
  const logoutBtn = document.getElementById('nav-logout-btn');

  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (loginBtn)  loginBtn.style.display  = 'none';
    if (userMenu)  userMenu.style.display  = 'flex';
    if (userName)  userName.textContent    = user?.name?.split(' ')[0] || 'User';
  } else {
    if (loginBtn)  loginBtn.style.display  = '';
    if (userMenu)  userMenu.style.display  = 'none';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.clearSession();
      window.location.href = '/home.html';
    });
  }
}

document.addEventListener('DOMContentLoaded', initNav);
