// public/js/api.js
// Shared fetch wrapper — all API calls go through here.

const BASE = '/api';

/**
 * Core fetch wrapper.
 * @param {string} endpoint  e.g. '/auth/login'
 * @param {object} options   fetch options (method, body, etc.)
 * @param {boolean} auth     attach JWT from localStorage?
 */
async function apiFetch(endpoint, options = {}, auth = false) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  if (auth) {
    const token = localStorage.getItem('ce_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
const Auth = {
  register: (name, email, password) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => apiFetch('/auth/me', {}, true),

  saveSession: (token, user) => {
    localStorage.setItem('ce_token', token);
    localStorage.setItem('ce_user', JSON.stringify(user));
  },

  clearSession: () => {
    localStorage.removeItem('ce_token');
    localStorage.removeItem('ce_user');
  },

  isLoggedIn: () => !!localStorage.getItem('ce_token'),

  getUser: () => {
    try { return JSON.parse(localStorage.getItem('ce_user')); }
    catch { return null; }
  },
};

// ── Courses helpers ───────────────────────────────────────────────────────────
const Courses = {
  getAll:       ()   => apiFetch('/courses'),
  getById:      (id) => apiFetch(`/courses/${id}`),
  getSubjects:  (id) => apiFetch(`/courses/${id}/subjects`),
  getSubject:   (id) => apiFetch(`/courses/subject/${id}`),
};

// ── Progress helpers ──────────────────────────────────────────────────────────
const Progress = {
  get:            ()   => apiFetch('/progress', {}, true),
  markComplete:   (id) => apiFetch(`/progress/${id}`, { method: 'POST' }, true),
  markIncomplete: (id) => apiFetch(`/progress/${id}`, { method: 'DELETE' }, true),
};

// ── Teachers helpers ──────────────────────────────────────────────────────────
const Teachers = {
  getAll: () => apiFetch('/teachers'),
};

// ── Admin helpers ─────────────────────────────────────────────────────────────
const Admin = {
  getUsers: () => apiFetch('/admin/users', {}, true),

  setRole: (userId, role) =>
    apiFetch(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    }, true),

  deleteUser: (userId) =>
    apiFetch(`/admin/users/${userId}`, {
      method: 'DELETE'
    }, true),
};

// ── Notes upload ──────────────────────────────────────────────────────────────
const NotesUpload = {
  upload: (data) => apiFetch('/notes/upload', { method: 'POST', body: JSON.stringify(data) }, true),
};
