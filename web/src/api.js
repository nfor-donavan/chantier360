const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
let token = localStorage.getItem('c360_token') || '';

export class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const setToken = (t) => { token = t || ''; t ? localStorage.setItem('c360_token', t) : localStorage.removeItem('c360_token'); };

async function request(path, { method = 'GET', body, form } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method, body: form || (body ? JSON.stringify(body) : undefined),
      headers: { ...(!form && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    });
  } catch { throw new ApiError(0, 'network'); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { setToken(''); window.dispatchEvent(new Event('c360:logout')); }
  if (!res.ok) throw new ApiError(res.status, data.error || 'Request failed');
  return data;
}
const post = (p, body) => request(p, { method: 'POST', body });
const patch = (p, body) => request(p, { method: 'PATCH', body });

export const api = {
  login: (email, password) => post('/auth/login', { email, password }),
  me: () => request('/auth/me'),
  dashboard: () => request('/dashboard'),
  projects: () => request('/projects'),
  project: (id) => request(`/projects/${id}`),
  createProject: (b) => post('/projects', b),
  updateProject: (id, b) => patch(`/projects/${id}`, b),
  addTask: (id, b) => post(`/projects/${id}/tasks`, b),
  updateTask: (id, tid, b) => patch(`/projects/${id}/tasks/${tid}`, b),
  addMilestone: (id, b) => post(`/projects/${id}/milestones`, b),
  updateMilestone: (id, mid, b) => patch(`/projects/${id}/milestones/${mid}`, b),
  photos: (id) => request(`/projects/${id}/photos`),
  addPhoto: (id, b) => post(`/projects/${id}/photos`, b),
  updatePhoto: (id, pid, b) => patch(`/projects/${id}/photos/${pid}`, b),
  addUpdate: (id, message) => post(`/projects/${id}/updates`, { message }),
  stock: (id) => request(`/projects/${id}/stock`),
  addStock: (id, b) => post(`/projects/${id}/stock`, b),
  logs: () => request('/materials/logs'),
  requests: () => request('/materials/requests'),
  decideRequest: (id, status) => patch(`/materials/requests/${id}`, { status }),
  attendance: () => request('/attendance'),
  decideAttendance: (id, status) => patch(`/attendance/${id}`, { status }),
  reports: (siteId) => request(`/reports${siteId ? `?siteId=${siteId}` : ''}`),
  alerts: (open) => request(`/alerts${open ? '?open=true' : ''}`),
  acknowledge: (id) => patch(`/alerts/${id}/acknowledge`),
  roles: () => request('/roles'),
  saveRole: (key, permissions) => request(`/roles/${key}`, { method: 'PUT', body: { permissions } }),
  users: () => request('/users'),
  createUser: (b) => post('/users', b),
  updateUser: (id, b) => patch(`/users/${id}`, b),
  clients: () => request('/clients'),
  portalProjects: () => request('/portal/projects'),
  portalProject: (id) => request(`/portal/projects/${id}`),
  upload: (file) => { const f = new FormData(); f.append('photo', file); return request('/uploads', { method: 'POST', form: f }); },
};
