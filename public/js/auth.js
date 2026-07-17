// public/js/auth.js
// Handles login/register form logic

// Redirect if already logged in
if (Auth.isLoggedIn()) {
  window.location.href = '/dashboard.html';
}

/** Switch between login / register tabs */
function switchTab(tab) {
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin     = document.getElementById('tab-login');
  const tabRegister  = document.getElementById('tab-register');
  const title        = document.getElementById('auth-title');
  const sub          = document.getElementById('auth-sub');

  clearMsg();

  if (tab === 'login') {
    loginForm.style.display    = 'flex';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    title.textContent = 'Welcome back';
    sub.textContent   = 'Sign in to continue learning';
  } else {
    loginForm.style.display    = 'none';
    registerForm.style.display = 'flex';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    title.textContent = 'Create account';
    sub.textContent   = 'Join CODEazy and start learning today';
  }
}

function showMsg(text, type = 'error') {
  const el = document.getElementById('auth-msg');
  el.textContent = text;
  el.className   = `auth-msg ${type}`;
}

function clearMsg() {
  const el = document.getElementById('auth-msg');
  el.className   = 'auth-msg';
  el.textContent = '';
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled     = loading;
  btn.textContent  = loading ? 'Please wait…' : (btnId === 'login-btn' ? 'Sign In' : 'Create Account');
}

async function handleLogin(e) {
  e.preventDefault();
  clearMsg();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  setLoading('login-btn', true);
  try {
    const { token, user } = await Auth.login(email, password);
    Auth.saveSession(token, user);
    showMsg('Login successful! Redirecting…', 'success');
    setTimeout(() => window.location.href = '/dashboard.html', 800);
  } catch (err) {
    showMsg(err.message);
  } finally {
    setLoading('login-btn', false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearMsg();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  setLoading('register-btn', true);
  try {
    const { token, user } = await Auth.register(name, email, password);
    Auth.saveSession(token, user);
    showMsg('Account created! Redirecting…', 'success');
    setTimeout(() => window.location.href = '/dashboard.html', 800);
  } catch (err) {
    showMsg(err.message);
  } finally {
    setLoading('register-btn', false);
  }
}

function handleGoogleAuth() {
  // Google OAuth requires a registered OAuth app and redirect URI.
  // Replace this URL with your actual Google OAuth endpoint when configured.
  showMsg('Google Sign-In not configured yet. Use email/password for now.', 'error');
}
